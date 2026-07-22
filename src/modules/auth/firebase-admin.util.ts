import { ConfigService } from "@nestjs/config";
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";

let cachedAuth: Auth | undefined;

/**
 * Firebase Admin SDK harus di-initialize sekali saja per proses. Disimpan
 * sebagai singleton modul (bukan di-inject lewat DI) supaya sederhana dan
 * tidak butuh lifecycle hook tambahan.
 */
export function getFirebaseAuth(configService: ConfigService): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app: App =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: configService.get<string>("FIREBASE_PROJECT_ID"),
        clientEmail: configService.get<string>("FIREBASE_CLIENT_EMAIL"),
        privateKey: configService
          .get<string>("FIREBASE_PRIVATE_KEY")
          ?.replace(/\\n/g, "\n"),
      }),
    });

  cachedAuth = getAuth(app);
  return cachedAuth;
}
