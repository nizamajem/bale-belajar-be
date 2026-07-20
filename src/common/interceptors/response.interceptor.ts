import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, map } from "rxjs";
import { RESPONSE_MESSAGE_KEY } from "../decorators/response-message.decorator";
import { ApiResponse } from "../interfaces/api-response.interface";

type ResponsePayload<T> = {
  data?: T;
  meta?: Record<string, unknown>;
  message?: string;
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T | ResponsePayload<T>, ApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T | ResponsePayload<T>>,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      "Data berhasil diproses.";

    return next.handle().pipe(
      map((payload) => {
        if (this.isResponsePayload(payload)) {
          return {
            success: true,
            message: payload.message ?? message,
            data: payload.data ?? (null as T),
            meta: payload.meta,
          };
        }

        return {
          success: true,
          message,
          data: payload,
        };
      }),
    );
  }

  private isResponsePayload(value: unknown): value is ResponsePayload<T> {
    return (
      typeof value === "object" &&
      value !== null &&
      ("data" in value || "meta" in value)
    );
  }
}
