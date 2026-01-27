/**
 * 数据库迁移脚本
 * 自动同步 MongoDB 集合与 Mongoose 模型定义
 *
 * 功能：
 * 1. 创建缺失的集合
 * 2. 添加模型中存在但数据库中缺失的字段
 * 3. 删除数据库中存在但模型中不存在的字段（可选，需要 --remove-extra 标志）
 *
 * 使用方法：
 *   node scripts/migrate-db.js              # 仅添加缺失字段
 *   node scripts/migrate-db.js --remove-extra  # 添加缺失字段并删除多余字段
 *   node scripts/migrate-db.js --dry-run     # 预览变更，不实际执行
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 导入所有模型
const User = require('../models/User');
const History = require('../models/History');
const Settings = require('../models/Settings');
const PublicModel = require('../models/PublicModel');
const Story = require('../models/Story');

// 配置
const CONFIG = {
  removeExtra: false,  // 是否删除多余字段
  dryRun: false,       // 是否仅预览
  dbName: 'ai-story-forge'
};

/**
 * 获取模型的字段定义
 */
function getModelFields(model) {
  const schema = model.schema;
  const fields = {};

  schema.eachPath((path, schemaType) => {
    // 跳过内部字段、_id 和 __v（MongoDB/Mongoose 自动生成）
    if (path.startsWith('__') || path === '_id' || path === '__v') return;

    fields[path] = {
      type: schemaType.instance,
      required: schemaType.required,
      default: schemaType.defaultValue,
      options: schemaType.options
    };
  });

  return fields;
}

/**
 * 将 Mongoose 类型映射到 MongoDB 类型
 */
function mapMongooseTypeToMongoDB(type) {
  const typeMap = {
    'String': 'string',
    'Number': 'number',
    'Boolean': 'boolean',
    'Date': 'object',      // Date 在 MongoDB 中存储为 object
    'ObjectId': 'object',  // ObjectId 在 MongoDB 中存储为 object
    'Array': 'object',     // Array 在 MongoDB 中存储为 object
    'Object': 'object',    // 嵌套对象在 MongoDB 中存储为 object
    'Mixed': 'object',
    'Buffer': 'object'
  };
  return typeMap[type] || type;
}

/**
 * 检查类型是否匹配（考虑 Mongoose 到 MongoDB 的映射）
 */
function isTypeMatch(mongooseType, mongoDBType) {
  const mappedType = mapMongooseTypeToMongoDB(mongooseType);
  return mappedType === mongoDBType;
}

/**
 * 获取数据库集合的当前字段
 */
async function getCollectionFields(collectionName, db) {
  try {
    const collection = db.collection(collectionName);
    const sample = await collection.findOne({});

    if (!sample) {
      return null; // 集合存在但为空
    }

    const fields = {};
    for (const key of Object.keys(sample)) {
      // 跳过 _id 和 __v（MongoDB/Mongoose 自动生成）
      if (key === '_id' || key === '__v') continue;
      fields[key] = typeof sample[key];
    }

    return fields;
  } catch (error) {
    return null; // 集合不存在
  }
}

/**
 * 检查并创建缺失的集合
 */
async function checkAndCreateCollections(db, modelMap) {
  console.log('\n📋 检查集合是否存在...\n');

  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  for (const [name, model] of Object.entries(modelMap)) {
    if (!existingNames.includes(name)) {
      console.log(`⚠️  集合 "${name}" 不存在`);

      if (CONFIG.dryRun) {
        console.log(`   [预览] 将创建集合: ${name}`);
      } else {
        try {
          await db.createCollection(name);
          console.log(`   ✅ 集合 "${name}" 已创建`);
        } catch (error) {
          console.log(`   ❌ 创建集合失败: ${error.message}`);
        }
      }
    } else {
      console.log(`✅ 集合 "${name}" 已存在`);
    }
  }
}

/**
 * 同步字段到数据库
 */
async function syncFields(collectionName, model, db) {
  console.log(`\n🔄 同步集合: ${collectionName}`);

  const modelFields = getModelFields(model);
  const dbFields = await getCollectionFields(collectionName, db);

  console.log(`   模型字段: ${Object.keys(modelFields).length} 个`);
  console.log(`   数据库字段: ${dbFields ? Object.keys(dbFields).length : 0} 个`);

  if (!dbFields) {
    console.log('   ⚠️  集合为空或不存在，跳过字段同步');
    return;
  }

  const collection = db.collection(collectionName);
  const modelFieldNames = Object.keys(modelFields).sort();
  const dbFieldNames = Object.keys(dbFields).sort();

  // 找出需要添加的字段
  const fieldsToAdd = modelFieldNames.filter(f => !dbFieldNames.includes(f));

  // 找出需要删除的字段
  const fieldsToRemove = dbFieldNames.filter(f => !modelFieldNames.includes(f));

  // 找出类型不匹配的字段
  const typeMismatches = [];
  for (const field of modelFieldNames) {
    if (dbFieldNames.includes(field)) {
      const modelType = modelFields[field].type;
      const dbType = dbFields[field];
      // 使用类型匹配函数（考虑 Mongoose 到 MongoDB 的映射）
      if (!isTypeMatch(modelType, dbType)) {
        typeMismatches.push({ field, modelType, dbType });
      }
    }
  }

  // 显示变更
  if (fieldsToAdd.length > 0) {
    console.log(`\n   ➕ 需要添加的字段 (${fieldsToAdd.length}):`);
    for (const field of fieldsToAdd) {
      const fieldDef = modelFields[field];
      const defaultValue = fieldDef.default !== undefined ? ` = ${JSON.stringify(fieldDef.default)}` : '';
      console.log(`      - ${field}: ${fieldDef.type}${defaultValue}`);
    }
  }

  if (fieldsToRemove.length > 0) {
    console.log(`\n   ➖ 需要删除的字段 (${fieldsToRemove.length}):`);
    for (const field of fieldsToRemove) {
      console.log(`      - ${field}: ${dbFields[field]}`);
    }
  }

  if (typeMismatches.length > 0) {
    console.log(`\n   ⚠️  类型不匹配的字段 (${typeMismatches.length}):`);
    for (const mismatch of typeMismatches) {
      console.log(`      - ${mismatch.field}: 数据库 ${mismatch.dbType} → 模型 ${mismatch.modelType}`);
    }
  }

  if (fieldsToAdd.length === 0 && fieldsToRemove.length === 0 && typeMismatches.length === 0) {
    console.log('   ✅ 字段已同步，无需变更');
    return;
  }

  // 执行变更
  if (CONFIG.dryRun) {
    console.log('\n   [预览模式] 不执行实际变更');
    return;
  }

  // 添加字段
  if (fieldsToAdd.length > 0) {
    console.log('\n   📤 添加字段...');
    for (const field of fieldsToAdd) {
      const fieldDef = modelFields[field];
      const update = {
        $set: {
          [field]: fieldDef.default !== undefined ? fieldDef.default : null
        }
      };

      try {
        await collection.updateMany({}, update);
        console.log(`      ✅ ${field} 已添加`);
      } catch (error) {
        console.log(`      ❌ ${field} 添加失败: ${error.message}`);
      }
    }
  }

  // 删除字段（需要 --remove-extra 标志）
  if (fieldsToRemove.length > 0) {
    if (CONFIG.removeExtra) {
      console.log('\n   🗑️  删除字段...');
      for (const field of fieldsToRemove) {
        try {
          await collection.updateMany({}, { $unset: { [field]: '' } });
          console.log(`      ✅ ${field} 已删除`);
        } catch (error) {
          console.log(`      ❌ ${field} 删除失败: ${error.message}`);
        }
      }
    } else {
      console.log('\n   ⚠️  跳过删除字段（使用 --remove-extra 标志启用）');
      for (const field of fieldsToRemove) {
        console.log(`      - ${field}`);
      }
    }
  }

  // 类型不匹配的字段（仅警告）
  if (typeMismatches.length > 0) {
    console.log('\n   ⚠️  注意：以下字段类型不匹配，需要手动处理');
    for (const mismatch of typeMismatches) {
      console.log(`      - ${mismatch.field}: ${mismatch.dbType} → ${mismatch.modelType}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  CONFIG.removeExtra = args.includes('--remove-extra');
  CONFIG.dryRun = args.includes('--dry-run');

  console.log('🚀 数据库迁移工具');
  console.log('==================\n');

  if (CONFIG.dryRun) {
    console.log('⚠️  预览模式：仅显示变更，不实际执行\n');
  }

  if (CONFIG.removeExtra) {
    console.log('⚠️  删除模式：将删除数据库中多余的字段\n');
  }

  try {
    // 连接数据库
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-forge';
    console.log(`📡 连接 MongoDB: ${mongoURI}\n`);
    await mongoose.connect(mongoURI);

    const db = mongoose.connection.db;

    // 定义模型映射
    const modelMap = {
      'users': User,
      'histories': History,
      'settings': Settings,
      'publicmodels': PublicModel,
      'stories': Story
    };

    // 1. 检查并创建缺失的集合
    await checkAndCreateCollections(db, modelMap);

    // 2. 同步每个集合的字段
    for (const [name, model] of Object.entries(modelMap)) {
      await syncFields(name, model, db);
    }

    console.log('\n✅ 迁移完成！\n');

    if (CONFIG.dryRun) {
      console.log('💡 提示：运行不带 --dry-run 标志的命令来应用这些变更');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();
