import { DataSource } from 'typeorm';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

const dataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'Root@1234',
  database: 'vn_jp_connect',
});

async function checkConnection() {
  const opts = dataSource.options as MysqlConnectionOptions;
  console.log('🔌 Đang thử kết nối tới MySQL...');
  console.log(`   Host    : ${opts.host}`);
  console.log(`   Port    : ${opts.port}`);
  console.log(`   Username: ${opts.username}`);
  console.log(`   Database: ${opts.database}`);
  console.log('');

  try {
    await dataSource.initialize();
    console.log('✅ Kết nối thành công! Database đã sẵn sàng.');
    await dataSource.destroy();
  } catch (error: any) {
    console.error('❌ Kết nối thất bại!');

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Sai username hoặc password MySQL.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`   → Database '${opts.database}' chưa tồn tại. Hãy tạo trước.`);
      console.error(`   → Chạy: CREATE DATABASE ${opts.database} CHARACTER SET utf8mb4;`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   → MySQL chưa được khởi động. Hãy start MySQL service.');
    } else {
      console.error(`   → Lỗi: ${error.message}`);
    }

    process.exit(1);
  }
}

checkConnection();
