import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, static as serveStatic, urlencoded } from "express";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>("API_PREFIX", "api/v1");
  const port = configService.get<number>("PORT", 4000);
  const frontendUrl = configService.get<string>("FRONTEND_URL", "http://localhost:3000");
  const profileUrl = configService.get<string>("PROFILE_URL", "http://localhost:3001");

  app.setGlobalPrefix(apiPrefix);
  app.use("/curriculum-assets", serveStatic(join(process.cwd(), "public", "curriculum-assets")));
  app.use(json({ limit: "25mb" }));
  app.use(urlencoded({ extended: true, limit: "25mb" }));
  app.use(helmet());
  app.enableCors({
    origin: [frontendUrl, profileUrl],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  const swaggerConfig = new DocumentBuilder()
    .setTitle("BaleBelajar API")
    .setDescription("REST API BaleBelajar untuk asesmen diagnostik.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
  console.log(`BaleBelajar API running on http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger docs running on http://localhost:${port}/docs`);
}

bootstrap().catch((error: unknown) => {
  console.error("Gagal menjalankan aplikasi:", error);
  process.exit(1);
});
