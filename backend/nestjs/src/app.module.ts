import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from './users/users.module';
import { RequestsModule } from './requests/requests.module';

@Module({
  imports: [UsersModule, RequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
