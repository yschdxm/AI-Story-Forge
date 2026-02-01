const axios = require('axios');
const sharp = require('sharp');

/**
 * 图片生成服务
 * 提供基于豆包AI的立绘和头像生成功能
 *
 * 注意：doubao-seededit-3.0-i2i 已下线
 * 使用 doubao-seedream-4.5 同时处理：
 * - 文生图：生成立绘（1440×2560）
 * - 图生图：从立绘裁切头像（1920×1920，满足最低像素要求）
 *
 * 压缩策略：
 * - 立绘：压缩到 1080×1920（保持6:19比例）
 * - 头像：压缩到 512×512
 */

// 默认配置
const DEFAULT_CONFIG = {
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: '8111a62f-0f7c-42f2-ba06-3f52201ac62f',
  portraitModel: 'doubao-seedream-4-5-251128',
  // doubao-seededit-3.0-i2i 已下线，使用 seedream-4.5 进行图片编辑
  avatarModel: 'doubao-seedream-4-5-251128'
};

/**
 * 生成角色立绘（1440*2560，纵向6:19）
 * @param {string} prompt - 生成提示词
 * @param {object} config - 配置信息
 * @returns {Promise<string>} 图片URL
 */
async function generatePortrait(prompt, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    const response = await axios.post(
      `${cfg.baseUrl}/images/generations`,
      {
        model: cfg.portraitModel,
        prompt: prompt,
        size: '1440x2560',  // 纵向6:19比例
        response_format: 'url',
        watermark: false
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const imageUrl = response.data?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('未获取到图片URL');
    }

    return imageUrl;
  } catch (error) {
    console.error('生成立绘失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

/**
 * 从立绘裁切头像（1920*1920，满足最低像素要求）
 * 使用 doubao-seedream-4.5 进行图片编辑（图文生图）
 * @param {string} portraitUrl - 立绘图片URL
 * @param {string} prompt - 裁切提示词
 * @param {object} config - 配置信息
 * @returns {Promise<string>} 头像图片URL
 */
async function cropAvatar(portraitUrl, prompt, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    const response = await axios.post(
      `${cfg.baseUrl}/images/generations`,
      {
        // 使用 seedream-4.5 进行图片编辑（它支持图文生图）
        model: cfg.avatarModel,
        prompt: prompt,
        image: portraitUrl,  // 传入原图进行编辑
        size: '1920x1920',   // 指定输出尺寸（满足最低像素要求）
        response_format: 'url',
        watermark: false
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const imageUrl = response.data?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('未获取到头像图片URL');
    }

    return imageUrl;
  } catch (error) {
    console.error('裁切头像失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

/**
 * 生成角色图片（立绘 + 头像）
 * @param {object} characterData - 角色数据
 * @param {object} config - 配置信息
 * @returns {Promise<{portraitUrl: string, avatarUrl: string}>}
 */
async function generateCharacterImages(characterData, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 生成立绘提示词
  const portraitPrompt = generatePortraitPrompt(characterData);

  console.log('生成立绘，提示词:', portraitPrompt);
  const portraitUrl = await generatePortrait(portraitPrompt, cfg);

  // 生成头像提示词（从立绘裁切）
  const avatarPrompt = generateAvatarPrompt(characterData);

  console.log('裁切头像，提示词:', avatarPrompt);
  const avatarUrl = await cropAvatar(portraitUrl, avatarPrompt, cfg);

  return { portraitUrl, avatarUrl };
}

/**
 * 生成立绘提示词
 */
function generatePortraitPrompt(characterData) {
  const name = characterData.name || '角色';
  const archetype = characterData.archetype || '';
  const appearance = characterData.appearance || '';
  const personality = characterData.personality || '';
  const setting = characterData.setting || '';

  let prompt = `动漫风格角色立绘，${name}`;

  if (archetype) {
    prompt += `，${archetype}`;
  }

  if (appearance) {
    prompt += `，${appearance}`;
  }

  if (personality) {
    prompt += `，${personality}`;
  }

  if (setting) {
    prompt += `，背景：${setting}`;
  }

  prompt += `，高质量，细节丰富，色彩鲜艳，动漫风格，全身像，纵向构图`;

  return prompt;
}

/**
 * 生成头像裁切提示词
 * 使用seedream-4.5进行图片编辑，从立绘中裁切出头部特写
 */
function generateAvatarPrompt(characterData) {
  const name = characterData.name || '角色';

  return `从立绘中裁切出${name}的头部特写头像，保持面部清晰和细节，动漫风格，1920x1920正方形构图，高质量，特写镜头`;
}

/**
 * 下载图片并转换为Base64
 * @param {string} url - 图片URL
 * @returns {Promise<string>} Base64编码的图片数据
 */
async function downloadImageAsBase64(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return base64;
  } catch (error) {
    console.error('下载图片失败:', error.message);
    throw error;
  }
}

/**
 * 压缩图片
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @param {object} options - 压缩选项
 * @param {number} options.width - 目标宽度
 * @param {number} options.height - 目标高度
 * @param {number} options.quality - JPEG质量 (1-100，默认80)
 * @returns {Promise<Buffer>} 压缩后的图片缓冲区
 */
async function compressImage(imageBuffer, options = {}) {
  const { width, height, quality = 80 } = options;

  try {
    let sharpInstance = sharp(imageBuffer);

    if (width && height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'cover',
        position: 'center'
      });
    }

    const compressedBuffer = await sharpInstance
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    return compressedBuffer;
  } catch (error) {
    console.error('图片压缩失败:', error.message);
    // 压缩失败时返回原图
    return imageBuffer;
  }
}

/**
 * 下载图片并压缩为Base64
 * @param {string} url - 图片URL
 * @param {object} options - 压缩选项
 * @param {number} options.width - 目标宽度
 * @param {number} options.height - 目标高度
 * @param {number} options.quality - JPEG质量 (1-100，默认80)
 * @returns {Promise<string>} 压缩后的Base64编码图片数据
 */
async function downloadAndCompressImageAsBase64(url, options = {}) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const imageBuffer = Buffer.from(response.data, 'binary');

    // 压缩图片
    const compressedBuffer = await compressImage(imageBuffer, options);

    const base64 = compressedBuffer.toString('base64');
    return base64;
  } catch (error) {
    console.error('下载或压缩图片失败:', error.message);
    throw error;
  }
}

/**
 * 生成图片并下载为Base64（带压缩）
 * @param {object} characterData - 角色数据
 * @param {object} config - 配置信息
 * @returns {Promise<{portraitBase64: string, avatarBase64: string}>}
 */
async function generateAndDownloadImages(characterData, config = {}) {
  // 生成图片URL
  const { portraitUrl, avatarUrl } = await generateCharacterImages(characterData, config);

  console.log('图片URL生成成功，开始下载并压缩...');

  // 下载并压缩图片
  // 立绘：压缩到 1080×1920（保持6:19比例）
  // 头像：压缩到 512×512
  const [portraitBase64, avatarBase64] = await Promise.all([
    downloadAndCompressImageAsBase64(portraitUrl, { width: 1080, height: 1920, quality: 85 }),
    downloadAndCompressImageAsBase64(avatarUrl, { width: 512, height: 512, quality: 85 })
  ]);

  console.log('图片下载并压缩完成');

  return {
    portraitBase64,
    avatarBase64,
    portraitUrl,
    avatarUrl
  };
}

module.exports = {
  generatePortrait,
  cropAvatar,
  generateCharacterImages,
  downloadImageAsBase64,
  downloadAndCompressImageAsBase64,
  generateAndDownloadImages,
  generatePortraitPrompt,
  generateAvatarPrompt,
  compressImage
};
