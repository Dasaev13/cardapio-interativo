import { env } from '../config/env';
import { supabase } from '../config/supabase';

export type BotEstado =
  | 'idle'
  | 'menu_sent'
  | 'cart_building'
  | 'checkout'
  | 'awaiting_address'
  | 'awaiting_payment'
  | 'awaiting_pix'
  | 'order_placed'
  | 'human_attendant';

// Enviar mensagem via Evolution API
export async function sendWhatsAppMessage(
  instance: string,
  phone: string,
  message: string
): Promise<void> {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) {
    console.warn('[WhatsApp] Evolution API não configurada');
    return;
  }

  const url = `${env.EVOLUTION_API_URL}/message/sendText/${instance}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: phone,
      options: { delay: 1000, presence: 'composing' },
      textMessage: { text: message },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[WhatsApp] Erro ao enviar mensagem: ${text}`);
  }
}

// Enviar imagem (QR Code Pix)
export async function sendWhatsAppImage(
  instance: string,
  phone: string,
  imageBase64: string,
  caption: string
): Promise<void> {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) return;

  const url = `${env.EVOLUTION_API_URL}/message/sendMedia/${instance}`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: phone,
      options: { delay: 1000 },
      mediaMessage: {
        mediatype: 'image',
        caption,
        media: imageBase64,
      },
    }),
  }).catch(err => console.error('[WhatsApp] Erro ao enviar imagem:', err));
}

// Buscar ou criar session do WhatsApp
export async function getOrCreateSession(lojaId: string, telefone: string) {
  const { data, error } = await supabase
    .from('sessions_whatsapp')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('telefone', telefone)
    .single();

  if (error?.code === 'PGRST116') {
    // Não existe - criar
    const { data: newSession, error: createError } = await supabase
      .from('sessions_whatsapp')
      .insert({ loja_id: lojaId, telefone, estado: 'idle', dados: {} })
      .select('*')
      .single();

    if (createError) throw createError;
    return newSession;
  }

  if (error) throw error;
  return data;
}

// Atualizar estado da session
export async function updateSessionEstado(
  lojaId: string,
  telefone: string,
  estado: BotEstado,
  dados?: Record<string, any>
): Promise<void> {
  const update: any = { estado };
  if (dados !== undefined) update.dados = dados;

  await supabase
    .from('sessions_whatsapp')
    .update(update)
    .eq('loja_id', lojaId)
    .eq('telefone', telefone);
}

// Processar mensagem recebida do WhatsApp (lógica do bot)
export async function processWhatsAppMessage(payload: {
  instance: string;
  phone: string;
  message: string;
  lojaId: string;
  loja: any;
}): Promise<void> {
  const { instance, phone, message, lojaId, loja } = payload;
  const msg = message.trim().toLowerCase();

  const session = await getOrCreateSession(lojaId, phone);

  // Verificar se está em atendimento humano
  if (session.estado === 'human_attendant') {
    // Verificar comando de retorno ao bot
    if (msg === '#voltarbot') {
      await updateSessionEstado(lojaId, phone, 'idle', {});
      await sendWhatsAppMessage(instance, phone,
        '✅ Você voltou para o atendimento automático!\n\nDigite *oi* para recomeçar.'
      );
    }
    // Caso contrário, ignorar (humano está atendendo)
    return;
  }

  // Verificar comandos que ativam atendimento humano
  const humanKeywords = ['atendente', 'humano', 'ajuda', 'suporte', 'problema', 'reclamação'];
  if (humanKeywords.some(kw => msg.includes(kw)) || msg === '2') {
    await updateSessionEstado(lojaId, phone, 'human_attendant', session.dados);
    await sendWhatsAppMessage(instance, phone,
      '👤 *Transferindo para atendente humano...*\n\nEm breve um atendente irá te ajudar.\n\nPara voltar ao atendimento automático, envie *#voltarbot*'
    );

    // Notificar operadores (via n8n)
    await sendN8nEvent('human_takeover_requested', {
      loja_id: lojaId,
      telefone: phone,
      mensagem: message,
    });
    return;
  }

  // Menu principal
  if (['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'oi!', 'menu', '1', 'cardapio', 'cardápio'].some(kw => msg.includes(kw)) || session.estado === 'idle') {
    const menuUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${loja.slug}`;

    const welcomeMsg = `Olá! 👋 Bem-vindo ao *${loja.nome}*!\n\n` +
      `🍔 Acesse nosso cardápio:\n${menuUrl}\n\n` +
      `Escolha uma opção:\n` +
      `*1️⃣ Ver cardápio*\n` +
      `*2️⃣ Falar com atendente*\n\n` +
      (loja.aberto ? '🟢 *Estamos abertos!*' : '🔴 *Estamos fechados no momento*');

    await sendWhatsAppMessage(instance, phone, welcomeMsg);
    await updateSessionEstado(lojaId, phone, 'menu_sent', session.dados);
    return;
  }

  // Mensagem não reconhecida
  if (session.estado === 'menu_sent') {
    await sendWhatsAppMessage(instance, phone,
      'Para fazer seu pedido, acesse nosso cardápio pelo link enviado.\n\n' +
      'Digite *1* para ver o menu ou *2* para falar com um atendente.'
    );
  }
}

// Enviar evento para n8n
export async function sendN8nEvent(event: string, data: Record<string, any>): Promise<void> {
  if (!env.N8N_WEBHOOK_URL) return;

  await fetch(env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
  }).catch(err => console.error('[n8n] Erro ao enviar evento:', err));
}
