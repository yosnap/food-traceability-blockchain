/**
 * Servicio de validación de transferencias direccionales
 * Implementa las restricciones del repositorio de referencia:
 * Producer → Factory → Retailer → Consumer
 */

import { UserRole } from '@/types';

export interface TransferRule {
  from: UserRole;
  to: UserRole[];
  description: string;
}

export class TransferValidationService {
  private static instance: TransferValidationService;

  private constructor() {}

  public static getInstance(): TransferValidationService {
    if (!TransferValidationService.instance) {
      TransferValidationService.instance = new TransferValidationService();
    }
    return TransferValidationService.instance;
  }

  /**
   * Reglas de transferencia direccional siguiendo el repositorio de referencia
   */
  private getTransferRules(): TransferRule[] {
    return [
      {
        from: UserRole.PRODUCER,
        to: [UserRole.FACTORY],
        description: 'Los productores solo pueden transferir a fábricas'
      },
      {
        from: UserRole.FACTORY,
        to: [UserRole.RETAILER],
        description: 'Las fábricas solo pueden transferir a minoristas'
      },
      {
        from: UserRole.RETAILER,
        to: [UserRole.CONSUMER],
        description: 'Los minoristas solo pueden transferir a consumidores'
      },
      {
        from: UserRole.CONSUMER,
        to: [],
        description: 'Los consumidores no pueden transferir (punto final)'
      },
      {
        from: UserRole.ADMIN,
        to: [UserRole.PRODUCER, UserRole.FACTORY, UserRole.RETAILER, UserRole.CONSUMER],
        description: 'Los administradores pueden transferir a cualquier rol'
      },
      // Roles adicionales con mapeo lógico
      {
        from: UserRole.PROCESSOR,
        to: [UserRole.RETAILER],
        description: 'Los procesadores pueden transferir a minoristas'
      },
      {
        from: UserRole.DISTRIBUTOR,
        to: [UserRole.RETAILER],
        description: 'Los distribuidores pueden transferir a minoristas'
      }
    ];
  }

  /**
   * Validar si una transferencia es permitida
   */
  public isTransferAllowed(fromRole: UserRole, toRole: UserRole): boolean {
    const rules = this.getTransferRules();
    const rule = rules.find(r => r.from === fromRole);
    
    if (!rule) {
      console.warn(`⚠️ No hay regla definida para el rol: ${fromRole}`);
      return false;
    }

    const isAllowed = rule.to.includes(toRole);
    
    console.log(`🔍 Validación de transferencia: ${fromRole} → ${toRole}`, {
      isAllowed,
      rule: rule.description,
      allowedTargets: rule.to
    });

    return isAllowed;
  }

  /**
   * Obtener roles válidos de destino para un rol específico
   */
  public getAllowedTargetRoles(fromRole: UserRole): UserRole[] {
    const rules = this.getTransferRules();
    const rule = rules.find(r => r.from === fromRole);
    return rule ? rule.to : [];
  }

  /**
   * Obtener descripción de la regla para un rol
   */
  public getTransferRuleDescription(fromRole: UserRole): string {
    const rules = this.getTransferRules();
    const rule = rules.find(r => r.from === fromRole);
    return rule ? rule.description : 'No hay reglas definidas para este rol';
  }

  /**
   * Validar transferencia con mensaje de error detallado
   */
  public validateTransfer(fromRole: UserRole, toRole: UserRole): {
    isValid: boolean;
    message: string;
    allowedTargets: UserRole[];
  } {
    const allowedTargets = this.getAllowedTargetRoles(fromRole);
    const isValid = this.isTransferAllowed(fromRole, toRole);

    let message: string;
    if (isValid) {
      message = `✅ Transferencia válida: ${fromRole} → ${toRole}`;
    } else {
      if (allowedTargets.length === 0) {
        message = `❌ ${fromRole} no puede realizar transferencias (punto final de la cadena)`;
      } else {
        message = `❌ ${fromRole} no puede transferir a ${toRole}. Destinos válidos: ${allowedTargets.join(', ')}`;
      }
    }

    return {
      isValid,
      message,
      allowedTargets
    };
  }

  /**
   * Obtener la cadena completa de transferencias permitidas
   */
  public getTransferChain(): string[] {
    return [
      'Producer → Factory',
      'Factory → Retailer', 
      'Retailer → Consumer',
      'Consumer (Punto final)'
    ];
  }

  /**
   * Verificar si un rol puede iniciar la cadena de transferencias
   */
  public canStartTransferChain(role: UserRole): boolean {
    return role === UserRole.PRODUCER || role === UserRole.ADMIN;
  }

  /**
   * Verificar si un rol es el punto final de la cadena
   */
  public isEndOfChain(role: UserRole): boolean {
    return role === UserRole.CONSUMER;
  }

  /**
   * Obtener el siguiente rol en la cadena
   */
  public getNextRoleInChain(currentRole: UserRole): UserRole | null {
    const allowedTargets = this.getAllowedTargetRoles(currentRole);
    
    // Para roles con múltiples destinos posibles, devolver el principal
    if (allowedTargets.length === 1) {
      return allowedTargets[0];
    } else if (allowedTargets.length > 1) {
      // Para admin, devolver null ya que puede ir a cualquiera
      if (currentRole === UserRole.ADMIN) {
        return null;
      }
      // Para otros roles, devolver el primer destino válido
      return allowedTargets[0];
    }
    
    return null;
  }

  /**
   * Obtener información completa de transferencias para un rol
   */
  public getTransferInfo(role: UserRole): {
    role: UserRole;
    description: string;
    allowedTargets: UserRole[];
    canStart: boolean;
    isEnd: boolean;
    nextInChain: UserRole | null;
  } {
    return {
      role,
      description: this.getTransferRuleDescription(role),
      allowedTargets: this.getAllowedTargetRoles(role),
      canStart: this.canStartTransferChain(role),
      isEnd: this.isEndOfChain(role),
      nextInChain: this.getNextRoleInChain(role)
    };
  }
}

// Exportar instancia singleton
export const transferValidationService = TransferValidationService.getInstance();