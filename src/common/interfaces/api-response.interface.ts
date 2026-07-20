export type ApiResponse<TData = unknown, TMeta = Record<string, unknown>> = {
  success: boolean;
  message: string;
  data: TData;
  meta?: TMeta;
};

