export class Logger {
  private static formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    return `[${timestamp}] [${level}] ${message} ${formattedArgs}`.trim();
  }

  static info(message: string, ...args: any[]): void {
    console.log(this.formatMessage('INFO', message, ...args));
  }

  static error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message, ...args));
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('WARN', message, ...args));
  }

  static debug(message: string, ...args: any[]): void {
    console.debug(this.formatMessage('DEBUG', message, ...args));
  }

  static trace(message: string, ...args: any[]): void {
    console.trace(this.formatMessage('TRACE', message, ...args));
  }
} 