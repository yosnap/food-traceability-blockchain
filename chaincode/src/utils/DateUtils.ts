/**
 * Utilidades para manejo de fechas en el sistema de trazabilidad
 * Food Traceability Blockchain Platform
 */

/**
 * Clase de utilidades para manejo de fechas
 */
export class DateUtils {
    
    /**
     * Convierte una fecha a formato ISO string
     */
    static toISOString(date: Date | string | number): string {
        if (typeof date === 'string') {
            return new Date(date).toISOString();
        }
        if (typeof date === 'number') {
            return new Date(date).toISOString();
        }
        return date.toISOString();
    }
    
    /**
     * Obtiene la fecha y hora actual en formato ISO
     */
    static getCurrentISOString(): string {
        return new Date().toISOString();
    }
    
    /**
     * Calcula la diferencia en días entre dos fechas
     */
    static daysDifference(date1: string | Date, date2: string | Date): number {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = d2.getTime() - d1.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Calcula días restantes hasta una fecha específica
     */
    static daysUntil(targetDate: string | Date): number {
        const now = new Date();
        const target = new Date(targetDate);
        const diffTime = target.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Verifica si una fecha es válida
     */
    static isValidDate(date: any): boolean {
        if (!date) return false;
        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime());
    }
    
    /**
     * Verifica si una fecha está en el futuro
     */
    static isFutureDate(date: string | Date): boolean {
        const target = new Date(date);
        const now = new Date();
        return target.getTime() > now.getTime();
    }
    
    /**
     * Verifica si una fecha está en el pasado
     */
    static isPastDate(date: string | Date): boolean {
        const target = new Date(date);
        const now = new Date();
        return target.getTime() < now.getTime();
    }
    
    /**
     * Agrega días a una fecha
     */
    static addDays(date: string | Date, days: number): string {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString();
    }
    
    /**
     * Resta días a una fecha
     */
    static subtractDays(date: string | Date, days: number): string {
        const d = new Date(date);
        d.setDate(d.getDate() - days);
        return d.toISOString();
    }
    
    /**
     * Obtiene el inicio del día para una fecha
     */
    static startOfDay(date: string | Date): string {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    }
    
    /**
     * Obtiene el final del día para una fecha
     */
    static endOfDay(date: string | Date): string {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
    }
    
    /**
     * Formatea una fecha para mostrar
     */
    static formatDateForDisplay(date: string | Date, locale: string = 'es-ES'): string {
        const d = new Date(date);
        return d.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    /**
     * Formatea fecha y hora para mostrar
     */
    static formatDateTimeForDisplay(date: string | Date, locale: string = 'es-ES'): string {
        const d = new Date(date);
        return d.toLocaleString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * Calcula fecha de caducidad basada en vida útil
     */
    static calculateExpirationDate(productionDate: string | Date, shelfLifeDays: number): string {
        return this.addDays(productionDate, shelfLifeDays);
    }
    
    /**
     * Verifica si un producto está próximo a caducar
     */
    static isNearExpiration(expirationDate: string | Date, warningDays: number = 2): boolean {
        const daysLeft = this.daysUntil(expirationDate);
        return daysLeft >= 0 && daysLeft <= warningDays;
    }
    
    /**
     * Verifica si un producto está caducado
     */
    static isExpired(expirationDate: string | Date): boolean {
        return this.daysUntil(expirationDate) < 0;
    }
    
    /**
     * Obtiene fechas para consultas de productos próximos a caducar
     */
    static getExpiryQueryDates(daysAhead: number): { startDate: string; endDate: string } {
        const now = new Date();
        const startDate = this.startOfDay(now);
        const endDate = this.endOfDay(this.addDays(now, daysAhead));
        
        return { startDate, endDate };
    }
    
    /**
     * Valida rango de fechas
     */
    static isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return this.isValidDate(start) && 
               this.isValidDate(end) && 
               start.getTime() <= end.getTime();
    }
    
    /**
     * Obtiene timestamp Unix
     */
    static getUnixTimestamp(date?: string | Date): number {
        const d = date ? new Date(date) : new Date();
        return Math.floor(d.getTime() / 1000);
    }
    
    /**
     * Convierte timestamp Unix a fecha ISO
     */
    static fromUnixTimestamp(timestamp: number): string {
        return new Date(timestamp * 1000).toISOString();
    }
    
    /**
     * Obtiene el primer día del mes
     */
    static startOfMonth(date: string | Date): string {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    }
    
    /**
     * Obtiene el último día del mes
     */
    static endOfMonth(date: string | Date): string {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1, 0);
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
    }
    
    /**
     * Calcula la edad de un producto en días
     */
    static getProductAge(productionDate: string | Date): number {
        const now = new Date();
        const production = new Date(productionDate);
        const diffTime = now.getTime() - production.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Obtiene un array de fechas entre dos fechas
     */
    static getDateRange(startDate: string | Date, endDate: string | Date): string[] {
        const dates: string[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const current = new Date(start);
        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        
        return dates;
    }
    
    /**
     * Formatea duración en texto legible
     */
    static formatDuration(days: number): string {
        if (days === 0) return 'Hoy';
        if (days === 1) return '1 día';
        if (days === -1) return 'Hace 1 día';
        if (days > 0) return `${days} días`;
        return `Hace ${Math.abs(days)} días`;
    }
    
    /**
     * Obtiene información de caducidad para mostrar al usuario
     */
    static getExpiryInfo(expirationDate: string | Date): {
        daysRemaining: number;
        status: 'fresh' | 'warning' | 'critical' | 'expired';
        message: string;
        color: 'green' | 'yellow' | 'orange' | 'red';
    } {
        const days = this.daysUntil(expirationDate);
        
        if (days < 0) {
            return {
                daysRemaining: days,
                status: 'expired',
                message: `Caducó ${this.formatDuration(days)}`,
                color: 'red'
            };
        }
        
        if (days === 0) {
            return {
                daysRemaining: days,
                status: 'critical',
                message: 'Caduca hoy',
                color: 'red'
            };
        }
        
        if (days === 1) {
            return {
                daysRemaining: days,
                status: 'critical',
                message: 'Caduca mañana',
                color: 'red'
            };
        }
        
        if (days <= 3) {
            return {
                daysRemaining: days,
                status: 'warning',
                message: `Caduca en ${days} días`,
                color: 'orange'
            };
        }
        
        if (days <= 7) {
            return {
                daysRemaining: days,
                status: 'warning',
                message: `Caduca en ${days} días`,
                color: 'yellow'
            };
        }
        
        return {
            daysRemaining: days,
            status: 'fresh',
            message: `Caduca en ${days} días`,
            color: 'green'
        };
    }
}