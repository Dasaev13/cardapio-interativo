import { Request, Response, NextFunction } from 'express';
import { handleMercadoPagoWebhook } from '../services/payment/card.service';
import { processWhatsAppMessage } from '../services/whatsapp.service';
import { supabase } from '../config/supabase';
import { printQueue } from '../config/queues';


export async function handleMercadoPagoWebhookController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ ok: true });

    handleMercadoPagoWebhook(req.body).then(async (pedidoId) => {
      if (!pedidoId) return;

      const { data: pedido } = await supabase
        .from('pedidos')
        .select('loja_id')
        .eq('id', pedidoId)
        .single();

      if (pedido) {
        await printQueue.add('print-order', {
          pedido_id: pedidoId,
          loja_id: pedido.loja_id,
        });
      }
    }).catch(err => console.error('[Webhook MP] Erro:', err));
  } catch (err) {
    next(err);
  }
}

export async function handleWhatsAppWebhookController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ ok: true });

    const { instance, data } = req.body;
    if (!data?.message?.conversation && !data?.message?.extendedTextMessage?.text) return;

    const phone = data.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const message = data.message?.conversation || data.message?.extendedTextMessage?.text || '';

    if (!phone || !message) return;

    // Buscar loja pela instância Evolution API (config->>'whatsapp_instance')
    const { data: loja } = await supabase
      .from('lojas')
      .select('id, slug, nome, aberto, config')
      .eq('config->>whatsapp_instance', instance)
      .eq('ativo', true)
      .single();

    if (!loja) {
      console.warn(`[WhatsApp] Instância ${instance} não tem loja associada`);
      return;
    }

    processWhatsAppMessage({
      instance,
      phone,
      message,
      lojaId: loja.id,
      loja,
    }).catch(err => console.error('[WhatsApp] Erro ao processar mensagem:', err));
  } catch (err) {
    next(err);
  }
}

export async function handleN8nWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { event, data } = req.body;

    switch (event) {
      case 'order_print_request':
        if (data?.pedido_id && data?.loja_id) {
          await printQueue.add('print-order', {
            pedido_id: data.pedido_id,
            loja_id: data.loja_id,
          });
        }
        break;

      default:
        console.log(`[n8n] Evento recebido: ${event}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
