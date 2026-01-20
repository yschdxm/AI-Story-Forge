/**
 * 管理员账户创建脚本
 * 使用方法: node scripts/create-admin.js <用户名> <密码>
 * 或直接运行: node scripts/create-admin.js (会提示输入)
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin(username, password) {
  try {
    // 连接数据库
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-forge';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 连接成功');

    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  已存在管理员账户:', existingAdmin.username);
      console.log('如需创建新管理员，请先删除现有管理员或修改其角色');
      process.exit(0);
    }

    // 创建管理员
    const admin = new User({
      username,
      password,
      role: 'admin'
    });

    await admin.save();

    console.log('✅ 管理员账户创建成功！');
    console.log('用户名:', admin.username);
    console.log('角色: admin');
    console.log('用户ID:', admin._id);

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建管理员失败:', error.message);
    process.exit(1);
  }
}

// 获取命令行参数或提示输入
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const args = process.argv.slice(2);

  if (args.length >= 2) {
    // 从命令行参数获取
    await createAdmin(args[0], args[1]);
  } else {
    // 交互式输入
    rl.question('请输入管理员用户名 (默认: admin): ', (username) => {
      if (!username) username = 'admin';

      rl.question('请输入管理员密码 (默认: admin123): ', async (password) => {
        if (!password) password = 'admin123';

        await createAdmin(username, password);
        rl.close();
      });
    });
  }
}

main();
