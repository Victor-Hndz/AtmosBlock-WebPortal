import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./services/users.service";
import { UsersController } from "./controllers/users.controller";
import { AuthModule } from "../auth/auth.module";
import { UserEntity } from "./persistence/entities/user.entity";
import { TypeOrmUserRepository } from "./persistence/repositories/typeorm-user.repository";
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), forwardRef(() => AuthModule)],
  providers: [
    UsersService,
    {
      provide: "IUserRepository",
      useClass: TypeOrmUserRepository,
    },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
