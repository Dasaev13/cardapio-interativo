-- ============================================================
-- MIGRATION 005: TRIGGERS
-- ============================================================

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_timestamp_lojas
  BEFORE UPDATE ON lojas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_categorias
  BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_produtos
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_pedidos
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_pagamentos
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_sessions
  BEFORE UPDATE ON sessions_whatsapp
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================
-- Trigger: Numeração sequencial de pedidos por loja
-- Garante numero único e crescente por loja_id
-- ============================================================
CREATE OR REPLACE FUNCTION assign_pedido_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_numero INTEGER;
BEGIN
  -- Lock para evitar race condition em pedidos simultâneos da mesma loja
  PERFORM pg_advisory_xact_lock(hashtext(NEW.loja_id::TEXT));

  SELECT COALESCE(MAX(numero), 0) + 1
  INTO v_next_numero
  FROM pedidos
  WHERE loja_id = NEW.loja_id;

  NEW.numero = v_next_numero;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedido_numero_trigger
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION assign_pedido_numero();

-- ============================================================
-- Trigger: Notificar mudança de status do pedido (Realtime)
-- Usado pelo Supabase Realtime para push ao frontend
-- ============================================================
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM pg_notify(
      'order_status_changed',
      json_build_object(
        'pedido_id', NEW.id,
        'loja_id', NEW.loja_id,
        'numero', NEW.numero,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'telefone_cliente', NEW.telefone_cliente,
        'timestamp', NOW()
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_status_notify_trigger
  AFTER UPDATE OF status ON pedidos
  FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();

-- ============================================================
-- Trigger: Atualizar status do pedido quando pagamento é aprovado
-- ============================================================
CREATE OR REPLACE FUNCTION sync_pedido_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Quando pagamento é aprovado, confirmar pedido
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    UPDATE pedidos
    SET status = 'confirmado'
    WHERE id = NEW.pedido_id
      AND status IN ('pendente', 'aguardando_pagamento');
  END IF;

  -- Quando pagamento expira ou é cancelado, cancelar pedido
  IF NEW.status IN ('expirado', 'cancelado') AND OLD.status NOT IN ('expirado', 'cancelado') THEN
    UPDATE pedidos
    SET status = 'cancelado'
    WHERE id = NEW.pedido_id
      AND status IN ('pendente', 'aguardando_pagamento');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_pedido_on_payment_trigger
  AFTER UPDATE OF status ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION sync_pedido_status_on_payment();

-- ============================================================
-- Trigger: Atualizar ultimo_contato da session ao receber mensagem
-- ============================================================
CREATE OR REPLACE FUNCTION update_session_ultimo_contato()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ultimo_contato = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER session_ultimo_contato_trigger
  BEFORE UPDATE ON sessions_whatsapp
  FOR EACH ROW EXECUTE FUNCTION update_session_ultimo_contato();
