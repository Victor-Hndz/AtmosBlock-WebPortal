import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

// WEB-205 (V9): requests per client IP.
// ponytail: in-memory counters per API instance; switch to a shared storage (Redis) if the API scales out,
// and configure "trust proxy" once it runs behind a reverse proxy so the client IP is the real one.
export const LIMITE_GLOBAL = [{ name: "default", ttl: 60_000, limit: 100 }];

// Login and register: strict, against brute force and mass sign-ups.
export const LIMITE_AUTH = { default: { ttl: 60_000, limit: 5 } };

/** Rate limiting on every endpoint (global ThrottlerGuard). */
@Module({
  imports: [ThrottlerModule.forRoot(LIMITE_GLOBAL)],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottlingModule {}
