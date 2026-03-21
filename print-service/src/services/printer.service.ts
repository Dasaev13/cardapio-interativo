import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { env } from '../config/env';
import { buildReceiptLines, type ReceiptData } from '../templates/order-receipt';

function createPrinter(): ThermalPrinter | null {
  if (env.NODE_ENV === 'development' && !env.PRINTER_INTERFACE && !env.PRINTER_NAME) {
    // Modo simulação (sem impressora configurada)
    return null;
  }

  const printerType: Record<string, PrinterTypes> = {
    epson: PrinterTypes.EPSON,
    star: PrinterTypes.STAR,
    bematech: PrinterTypes.EPSON, // Bematech usa protocolo ESC/POS similar
    network: PrinterTypes.EPSON,
    console: PrinterTypes.EPSON,
  };

  const interface_ = env.PRINTER_INTERFACE
    || (env.PRINTER_NAME ? `printer:${env.PRINTER_NAME}` : 'tcp://127.0.0.1:9100');

  const printer = new ThermalPrinter({
    type: printerType[env.PRINTER_TYPE] || PrinterTypes.EPSON,
    interface: interface_,
    characterSet: CharacterSet.PC860_PORTUGUESE,
    breakLine: BreakLine.WORD,
    options: {
      timeout: 5000,
    },
  });

  return printer;
}

export async function printOrder(data: ReceiptData): Promise<void> {
  const printer = createPrinter();
  const lines = buildReceiptLines(data);

  // Modo console (desenvolvimento / sem impressora)
  if (!printer) {
    console.log('\n' + '='.repeat(42));
    console.log('📄 SIMULAÇÃO DE IMPRESSÃO:');
    console.log('='.repeat(42));
    for (const line of lines) {
      const text = line.text;
      if (line.align === 'center') {
        const padding = Math.max(0, Math.floor((42 - text.length) / 2));
        console.log(' '.repeat(padding) + text);
      } else if (line.align === 'right') {
        console.log(text.padStart(42));
      } else {
        console.log(text);
      }
    }
    console.log('='.repeat(42) + '\n');
    return;
  }

  // Impressão real
  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error('Impressora não encontrada ou offline');
    }

    printer.newLine();
    printer.newLine();

    for (const line of lines) {
      if (line.size === 'large') {
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
      }

      if (line.bold) printer.bold(true);

      switch (line.align) {
        case 'center': printer.alignCenter(); break;
        case 'right': printer.alignRight(); break;
        default: printer.alignLeft(); break;
      }

      if (line.text === '─'.repeat(42) || line.text.startsWith('─')) {
        printer.drawLine();
      } else {
        printer.println(line.text);
      }

      if (line.bold) printer.bold(false);
      if (line.size === 'large') {
        printer.setTextNormal();
      }
    }

    printer.newLine();
    printer.newLine();
    printer.cut();

    await printer.execute();

    console.log(`[Printer] Pedido #${data.pedido.numero} impresso com sucesso`);
  } catch (err: any) {
    console.error('[Printer] Erro ao imprimir:', err.message);
    throw err;
  }
}
