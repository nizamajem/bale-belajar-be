import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

type ValidationError = {
  field?: string;
  message: string;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errors = this.extractErrors(exceptionResponse);
    const message = this.extractMessage(exceptionResponse, status);

    response.status(status).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractMessage(response: unknown, status: HttpStatus): string {
    if (typeof response === "object" && response !== null && "message" in response) {
      const message = response.message;
      if (Array.isArray(message)) {
        return "Validasi gagal.";
      }
      if (typeof message === "string") {
        return message;
      }
    }

    if (typeof response === "string") {
      return response;
    }

    return status === HttpStatus.INTERNAL_SERVER_ERROR
      ? "Terjadi kesalahan pada server."
      : "Permintaan gagal diproses.";
  }

  private extractErrors(response: unknown): ValidationError[] {
    if (typeof response !== "object" || response === null || !("message" in response)) {
      return [];
    }

    const message = response.message;
    if (!Array.isArray(message)) {
      return [];
    }

    return message.map((item) => {
      if (typeof item === "string") {
        const [field, ...rest] = item.split(" ");
        return {
          field,
          message: rest.length > 0 ? item : "Validasi gagal.",
        };
      }

      return {
        message: "Validasi gagal.",
      };
    });
  }
}
