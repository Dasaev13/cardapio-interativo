import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';

interface ParsedOrderItem {
  nome: string;
  quantidade: number;
  observacao?: string;
}

interface ParsedOrder {
  itens: ParsedOrderItem[];
  confidence: number;
  raw_message: string;
}

export async function parseOrderMessage(
  message: string,
  menuItems: Array<{ id: string; nome: string; descricao?: string; preco: number }>
): Promise<ParsedOrder> {
  if (!env.ANTHROPIC_API_KEY) {
    console.warn('[AI] ANTHROPIC_API_KEY não configurada');
    return { itens: [], confidence: 0, raw_message: message };
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const menuText = menuItems
    .map(item => `- ${item.nome} (R$${item.preco.toFixed(2)})`)
    .join('\n');

  const prompt = `Você é um parser de pedidos para um restaurante brasileiro.

Menu disponível:
${menuText}

Mensagem do cliente: "${message}"

Analise a mensagem e extraia os itens do pedido. Retorne APENAS um JSON válido, sem texto adicional:
{
  "itens": [
    {
      "nome": "nome_exato_do_menu",
      "quantidade": numero_inteiro,
      "observacao": "instrucoes_especiais_ou_null"
    }
  ],
  "confidence": 0.0_a_1.0
}

Regras:
- Use o nome EXATO do menu (case-insensitive match)
- Ignore itens que não existem no menu
- Interprete "2x", "dois", "2 unidades" como quantidade 2
- Extraia observações como "sem cebola", "bem passado", "extra molho"
- confidence: 1.0 = certeza total, 0.0 = não conseguiu parsear`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return { itens: [], confidence: 0, raw_message: message };
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { itens: [], confidence: 0, raw_message: message };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      itens: parsed.itens || [],
      confidence: parsed.confidence || 0,
      raw_message: message,
    };
  } catch (err) {
    console.error('[AI] Erro ao parsear pedido:', err);
    return { itens: [], confidence: 0, raw_message: message };
  }
}
