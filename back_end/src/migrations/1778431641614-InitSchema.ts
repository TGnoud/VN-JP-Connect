import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1778431641614 implements MigrationInterface {
    name = 'InitSchema1778431641614'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`full_name\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_interests\` (\`user_id\` int NOT NULL, \`tag_id\` int NOT NULL, PRIMARY KEY (\`user_id\`, \`tag_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tags\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(50) NOT NULL, \`type\` enum ('interest', 'purpose') NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`matches\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`requester_id\` int NOT NULL, \`receiver_id\` int NOT NULL, \`status\` enum ('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`conversations\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`match_id\` bigint NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`REL_aa63ffa7f6a65ba46a12b7850d\` (\`match_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`messages\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`conversation_id\` bigint NOT NULL, \`sender_id\` int NOT NULL, \`content\` text NOT NULL, \`translated_content\` text NULL, \`sent_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`event_participants\` (\`event_id\` bigint NOT NULL, \`user_id\` int NOT NULL, \`joined_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`event_id\`, \`user_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`events\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`organizer_id\` int NOT NULL, \`title\` varchar(200) NOT NULL, \`event_date\` datetime NOT NULL, \`location\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_interests\` ADD CONSTRAINT \`FK_cb0511a8fabd1a2ac9912f7a9aa\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_interests\` ADD CONSTRAINT \`FK_39591ae452017dfe533b8d7c8fb\` FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_5bba7c6d8304e132d56d41da66c\` FOREIGN KEY (\`requester_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_32f576cc1d36ed5187a8e55f3a7\` FOREIGN KEY (\`receiver_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversations\` ADD CONSTRAINT \`FK_aa63ffa7f6a65ba46a12b7850d7\` FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_3bc55a7c3f9ed54b520bb5cfe23\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_22133395bd13b970ccd0c34ab22\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`event_participants\` ADD CONSTRAINT \`FK_b5349807aae71193d0cc0f52e35\` FOREIGN KEY (\`event_id\`) REFERENCES \`events\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`event_participants\` ADD CONSTRAINT \`FK_ce3f433e47fdd8f072964293c8d\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`events\` ADD CONSTRAINT \`FK_14c9ce53a2c2a1c781b8390123e\` FOREIGN KEY (\`organizer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`events\` DROP FOREIGN KEY \`FK_14c9ce53a2c2a1c781b8390123e\``);
        await queryRunner.query(`ALTER TABLE \`event_participants\` DROP FOREIGN KEY \`FK_ce3f433e47fdd8f072964293c8d\``);
        await queryRunner.query(`ALTER TABLE \`event_participants\` DROP FOREIGN KEY \`FK_b5349807aae71193d0cc0f52e35\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_22133395bd13b970ccd0c34ab22\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_3bc55a7c3f9ed54b520bb5cfe23\``);
        await queryRunner.query(`ALTER TABLE \`conversations\` DROP FOREIGN KEY \`FK_aa63ffa7f6a65ba46a12b7850d7\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_32f576cc1d36ed5187a8e55f3a7\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_5bba7c6d8304e132d56d41da66c\``);
        await queryRunner.query(`ALTER TABLE \`user_interests\` DROP FOREIGN KEY \`FK_39591ae452017dfe533b8d7c8fb\``);
        await queryRunner.query(`ALTER TABLE \`user_interests\` DROP FOREIGN KEY \`FK_cb0511a8fabd1a2ac9912f7a9aa\``);
        await queryRunner.query(`DROP TABLE \`events\``);
        await queryRunner.query(`DROP TABLE \`event_participants\``);
        await queryRunner.query(`DROP TABLE \`messages\``);
        await queryRunner.query(`DROP INDEX \`REL_aa63ffa7f6a65ba46a12b7850d\` ON \`conversations\``);
        await queryRunner.query(`DROP TABLE \`conversations\``);
        await queryRunner.query(`DROP TABLE \`matches\``);
        await queryRunner.query(`DROP TABLE \`tags\``);
        await queryRunner.query(`DROP TABLE \`user_interests\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
