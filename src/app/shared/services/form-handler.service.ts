import { Injectable, inject } from '@angular/core';
import { ToastService } from '@shared/presentation/components/toast-container/toast.service';
import { SuccessResponse, ErrorResponse } from '@shared/models/api-response.model';
import { FormGroup } from '@angular/forms';

export interface FormHandlerConfig {
    form?: FormGroup;
    sendingFlag?: boolean;
    action?: 'create' | 'update';
    resetFormCallback?: () => void;
    emitCallback?: () => void;
}

@Injectable({ providedIn: 'root' })
export class FormHandlerService {
    private toast = inject(ToastService);

    /**
     * Maneja una respuesta exitosa de forma genérica
     */
    handleSuccess<T>(
        resp: SuccessResponse<T>,
        config: FormHandlerConfig = {}
    ): void {
        const actionText = config.action === 'create' ? 'creado' : 'actualizado';
        const entityName = this.getEntityNameFromResponse(resp) || 'Registro';

        this.toast.showSuccess(`${entityName} ${actionText}`, resp.message);
        this.finalizeOperation(config);
    }

    /**
     * Maneja un error de forma genérica
     */
    handleError(
        err: ErrorResponse,
        config: FormHandlerConfig = {}
    ): void {
        const actionText = config.action === 'create' ? 'crear' : 'actualizar';
        const entityName = this.getEntityNameFromError(err) || 'registro';

        this.toast.showError(`Error al ${actionText} ${entityName}`, err.message);
        this.finalizeOperation(config);
    }

    /**
     * Finaliza la operación (común para éxito y error)
     */
    private finalizeOperation(config: FormHandlerConfig): void {
        // Actualizar estado de envío
        if (config.sendingFlag !== undefined) {
            config.sendingFlag = false;
        }

        // Emitir callback si existe
        if (config.emitCallback) {
            config.emitCallback();
        }

        // Resetear formulario solo en creación
        if (config.action === 'create' && config.resetFormCallback) {
            config.resetFormCallback();
        }
    }

    /**
     * Extrae nombre de entidad desde la respuesta (personalizable)
     */
    private getEntityNameFromResponse(resp: SuccessResponse): string {
        // Puedes personalizar esto según tu estructura de respuestas
        return resp.entityName || 'Registro';
    }

    /**
     * Extrae nombre de entidad desde el error (personalizable)
     */
    private getEntityNameFromError(err: ErrorResponse): string {
        // Puedes personalizar esto según tu estructura de errores
        return err.entityName || 'registro';
    }
}