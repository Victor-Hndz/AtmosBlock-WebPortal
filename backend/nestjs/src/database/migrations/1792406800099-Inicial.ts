import { MigrationInterface, QueryRunner } from "typeorm";

export class Inicial1792406800099 implements MigrationInterface {
  name = "Inicial1792406800099";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Línea base (WEB-305): una base creada antes por synchronize ya tiene este esquema, generado de las mismas
    // entidades; no se toca y la migración queda registrada como aplicada.
    if (await queryRunner.hasTable("requests")) return;
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`);
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."requests_request_status_enum" AS ENUM('GENERATING', 'CACHED', 'EXPIRED', 'EMPTY')`
    );
    await queryRunner.query(
      `CREATE TABLE "requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_hash" character varying NOT NULL, "request_status" "public"."requests_request_status_enum" NOT NULL DEFAULT 'EMPTY', "variable_name" character varying NOT NULL, "pressure_levels" text array NOT NULL, "years_selected" text array NOT NULL, "months_selected" text array NOT NULL, "days_selected" text array NOT NULL, "hours_selected" text array NOT NULL, "area_covered" text array NOT NULL, "map_types" text array NOT NULL, "map_levels" text array DEFAULT '{20}', "file_format_selected" character varying, "no_data" boolean NOT NULL DEFAULT false, "no_maps" boolean NOT NULL DEFAULT false, "omp" boolean NOT NULL DEFAULT false, "mpi" boolean NOT NULL DEFAULT false, "n_threads" integer, "n_proces" integer, "times_requested" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "generated_files_id" uuid, CONSTRAINT "PK_0428f484e96f9e6a55955f29b5f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."generated_files_status_enum" AS ENUM('pending', 'processing', 'complete', 'error')`
    );
    await queryRunner.query(
      `CREATE TABLE "generated_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_hash" character varying NOT NULL, "files" text array NOT NULL DEFAULT '{}', "status" "public"."generated_files_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "generated_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d65b0f247c14a5a49c9f747ba42" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user_requests" ("user_id" uuid NOT NULL, "request_id" uuid NOT NULL, CONSTRAINT "PK_e55ae6705bdd6d5252c24843d07" PRIMARY KEY ("user_id", "request_id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_93a52df8163601a2fc0786dd5c" ON "user_requests"  ("user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_6995341ff6f53e440a1635cae8" ON "user_requests"  ("request_id") `);
    await queryRunner.query(
      `ALTER TABLE "requests" ADD CONSTRAINT "FK_a73afcfba8d8e6ea16758c34970" FOREIGN KEY ("generated_files_id") REFERENCES "generated_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_requests" ADD CONSTRAINT "FK_93a52df8163601a2fc0786dd5c5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "user_requests" ADD CONSTRAINT "FK_6995341ff6f53e440a1635cae86" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_requests" DROP CONSTRAINT "FK_6995341ff6f53e440a1635cae86"`);
    await queryRunner.query(`ALTER TABLE "user_requests" DROP CONSTRAINT "FK_93a52df8163601a2fc0786dd5c5"`);
    await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_a73afcfba8d8e6ea16758c34970"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6995341ff6f53e440a1635cae8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_93a52df8163601a2fc0786dd5c"`);
    await queryRunner.query(`DROP TABLE "user_requests"`);
    await queryRunner.query(`DROP TABLE "generated_files"`);
    await queryRunner.query(`DROP TYPE "public"."generated_files_status_enum"`);
    await queryRunner.query(`DROP TABLE "requests"`);
    await queryRunner.query(`DROP TYPE "public"."requests_request_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
