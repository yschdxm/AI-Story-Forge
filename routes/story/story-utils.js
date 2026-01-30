const jwt = require('jsonwebtoken');
const axios = require('axios');
const History = require('../../models/History');
const Story = require('../../models/Story');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-story-forge-secret-key-change-in-production';

/**
 * 从JWT获取用户ID
 */
function getUserIdFromToken(authHeader) {
  if (!authHeader) return null;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

/**
 * 构建故事数据提示词
 */
function buildStoryDataPrompt(name, characters, plot, world, plotHistory, worldHistory) {
  let prompt = `你正在为一个故事生成完整数据。请严格按照JSON格式返回。

## 故事信息
**故事名称**：${name}

## 角色配置
`;

  characters.forEach((char, index) => {
    const isAuto = !char.historyId;
    const source = isAuto ? '（需要AI生成）' : '（已有历史记录）';
    prompt += `${index + 1}. ${char.role} ${source}\n`;
    if (!isAuto) {
      const history = plotHistory || worldHistory;
      if (history) {
        const charData = history.structuredData?.character || {};
        prompt += `   名称：${charData.name || '未知'}\n`;
      }
    }
    prompt += '\n';
  });

  prompt += `## 情节配置
${!plot.historyId ? '（需要AI生成完整情节）' : '（已有历史记录）'}

## 世界观配置
${!world.historyId ? '（需要AI生成完整世界观）' : '（已有历史记录）'}

## 📝 输出格式
请严格按照以下JSON格式返回：

\`\`\`json
{
  "characters": [
    {
      "name": "角色名称",
      "archetype": "角色原型（如：英雄、反派、导师等）",
      "setting": "角色背景/出身",
      "traits": ["特质1", "特质2", "特质3"],
      "appearance": "外貌描述",
      "personality": "性格描述",
      "backstory": "背景故事",
      "motivation": "动机/目标",
      "abilities": ["能力1", "能力2"],
      "roleInStory": "在故事中的作用"
    }
  ],
  "plot": {
    "title": "情节标题",
    "summary": "情节概要",
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "genre": "故事类型（如：科幻、奇幻、悬疑等）",
    "complexity": "复杂度（如：简单、中等、复杂）",
    "acts": [
      {
        "actNumber": 1,
        "title": "第一幕标题",
        "description": "第一幕描述",
        "keyEvents": ["事件1", "事件2"]
      }
    ],
    "climax": "高潮",
    "resolution": "结局",
    "themes": ["主题1", "主题2"]
  },
  "world": {
    "worldName": "世界名称",
    "era": "时代背景",
    "technology": "科技水平",
    "magicSystem": {
      "name": "魔法体系名称",
      "rules": ["规则1", "规则2"],
      "limitations": ["限制1", "限制2"],
      "source": "魔法来源"
    },
    "culture": "文化背景",
    "geography": "地理环境",
    "politics": "政治制度",
    "economy": "经济体系",
    "religions": ["宗教1", "宗教2"],
    "notableLocations": [
      {
        "name": "地点名称",
        "description": "地点描述"
      }
    ],
    "uniqueFeatures": ["独特特征1", "独特特征2"]
  }
}
\`\`\`

## ⚠️ 重要提示
1. **所有字段都必须填写**，不能为空或null
2. **数组字段**必须是数组格式，即使只有一个元素
3. **角色数据**：为每个自动生成的角色创建完整的详细信息
4. **情节数据**：创建完整的三幕结构
5. **世界观数据**：创建详细的世界设定
6. **返回语言**：中文
7. **必须返回JSON格式**

请开始生成：`;

  return prompt;
}

/**
 * 构建故事开场提示词
 */
function buildStoryOpeningPrompt(story) {
  let prompt = `你正在为一个故事生成开场。请按照以下要求生成：

## 故事信息
**故事名称**：${story.name}

## 🌍 世界观
${story.world.worldName ? `**世界名称**：${story.world.worldName}\n` : ''}
**时代背景**：${story.world.era || '未知'}
**科技水平**：${story.world.technology || '未知'}
**魔法体系**：${typeof story.world.magicSystem === 'string' ? story.world.magicSystem : story.world.magicSystem?.name || '无'}
**文化背景**：${story.world.culture || '未知'}
${story.world.geography ? `**地理环境**：${story.world.geography}\n` : ''}

## 📖 故事情节
${story.plot.title ? `**情节标题**：${story.plot.title}\n` : ''}
${story.plot.summary ? `**情节概要**：${story.plot.summary}\n` : ''}
**故事类型**：${story.plot.genre || '未知'}
**关键词**：${Array.isArray(story.plot.keywords) ? story.plot.keywords.join(', ') : story.plot.keywords || '无'}
${story.plot.themes?.length ? `**主题**：${story.plot.themes.join(', ')}\n` : ''}

## 🎭 角色设定
`;

  story.characters.forEach((char, index) => {
    prompt += `${index + 1}. ${char.role}：${char.name}\n`;
    if (char.archetype) prompt += `   原型：${char.archetype}\n`;
    if (char.setting) prompt += `   背景：${char.setting}\n`;
    if (char.traits) {
      const traits = Array.isArray(char.traits) ? char.traits.join(', ') : char.traits;
      prompt += `   特质：${traits}\n`;
    }
    if (char.personality) prompt += `   性格：${char.personality}\n`;
    if (char.backstory) prompt += `   背景故事：${char.backstory}\n`;
    prompt += '\n';
  });

  prompt += `## 🎯 生成要求
请生成故事的开场，包括：
1. **旁白介绍**：用叙述性的语言介绍故事的背景、场景和当前状态（100-200字）
2. **NPC首次对话**：选择一个NPC角色，让他/她开始第一次对话

## 📝 输出格式
请严格按照以下JSON格式返回（注意：每个字段都必须填写，不能为空）：
\`\`\`json
{
  "responses": [
    {
      "type": "旁白",
      "content": "叙述性文字（必须填写，不能为空）"
    },
    {
      "type": "NPC",
      "characterName": "角色名（必须填写，不能为空）",
      "content": "对话内容（必须填写，不能为空）"
    }
  ]
}
\`\`\`

## ⚠️ 重要提示
- 旁白要简洁生动，营造氛围
- NPC对话要符合角色性格和设定
- 对话要自然，不要过于生硬
- 只生成一个NPC的对话即可
- 必须返回JSON格式
- **每个字段都必须填写，不能为null或空**
- NPC对话不能放在旁白里
- 不能代替主角说话
- 返回语言为中文

请开始生成：`;

  return prompt;
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(story) {
  let prompt = '你正在演绎一个故事。请严格遵循以下背景设定：\n\n';

  // 世界观
  prompt += '## 🌍 世界观\n';
  if (story.world.worldName) prompt += `**世界名称**：${story.world.worldName}\n`;
  prompt += `时代背景：${story.world.era || '未知'}\n`;
  prompt += `科技水平：${story.world.technology || '未知'}\n`;
  if (typeof story.world.magicSystem === 'string') {
    prompt += `魔法体系：${story.world.magicSystem || '无'}\n`;
  } else if (story.world.magicSystem && story.world.magicSystem.name) {
    prompt += `魔法体系：${story.world.magicSystem.name}\n`;
    if (story.world.magicSystem.rules) {
      prompt += `魔法规则：${story.world.magicSystem.rules.join(', ')}\n`;
    }
  }
  prompt += `文化背景：${story.world.culture || '未知'}\n`;
  if (story.world.geography) prompt += `地理环境：${story.world.geography}\n`;
  if (story.world.religions?.length) prompt += `宗教信仰：${story.world.religions.join(', ')}\n`;
  prompt += '\n';

  // 情节
  prompt += '## 📖 故事情节\n';
  if (story.plot.title) prompt += `**情节标题**：${story.plot.title}\n`;
  if (story.plot.summary) prompt += `**情节概要**：${story.plot.summary}\n`;
  prompt += `类型：${story.plot.genre || '未知'}\n`;
  prompt += `复杂度：${story.plot.complexity || '未知'}\n`;
  if (story.plot.keywords?.length) {
    prompt += `关键词：${Array.isArray(story.plot.keywords) ? story.plot.keywords.join(', ') : story.plot.keywords}\n`;
  }
  if (story.plot.themes?.length) prompt += `主题：${story.plot.themes.join(', ')}\n`;
  prompt += '\n';

  // 角色
  prompt += '## 🎭 角色设定\n';
  story.characters.forEach((char, index) => {
    prompt += `${index + 1}. ${char.role} - ${char.name || '未命名'}\n`;
    if (char.archetype) prompt += `   原型：${char.archetype}\n`;
    if (char.setting) prompt += `   背景：${char.setting}\n`;
    if (char.traits) {
      const traits = Array.isArray(char.traits) ? char.traits.join(', ') : char.traits;
      prompt += `   特质：${traits}\n`;
    }
    if (char.personality) prompt += `   性格：${char.personality}\n`;
    if (char.appearance) prompt += `   外貌：${char.appearance}\n`;
    if (char.motivation) prompt += `   动机：${char.motivation}\n`;
    if (char.abilities?.length) prompt += `   能力：${char.abilities.join(', ')}\n`;
    prompt += '\n';
  });

  // 记忆
  if (story.memories && story.memories.length > 0) {
    prompt += '## 💾 记忆\n';
    story.memories.slice(-3).forEach((mem, i) => {
      prompt += `记忆${i + 1}: ${mem.summary}\n`;
    });
    prompt += '\n';
  }

  // 对话历史
  if (story.messages && story.messages.length > 0) {
    prompt += '## 💬 对话历史\n';
    const recentMessages = story.messages.slice(-50);
    recentMessages.forEach(msg => {
      const role = msg.type === '记忆' ? '系统' : msg.type;
      const charName = msg.characterId !== undefined ? story.characters[msg.characterId]?.name : '';
      const prefix = charName ? `${role}(${charName})` : role;
      prompt += `${prefix}: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  prompt += '## 📝 演绎规则\n';
  prompt += '1. 严格遵循角色设定，保持角色一致性\n';
  prompt += '2. 根据故事情节发展对话\n';
  prompt += '3. 对话要自然、生动，符合角色性格\n';
  prompt += '4. **旁白使用规则（重要）**：\n';
  prompt += '   - **动作、神态、语气必须用旁白**：角色的表情、动作、神态、语气变化等，都要放在旁白中\n';
  prompt += '   - **对话只包含纯文本**：NPC的对话内容应该是纯文本，不包含括号、动作描写等\n';
  prompt += '   - **不要滥用长段旁白**：简短的动作可以省略，只在重要时刻使用旁白\n';
  prompt += '   - **示例**：\n';
  prompt += '     * 错误：NPC对话包含\"(深棕色的头发微微晃动，语气冰冷) 带路？不，我不能。\"\n';
  prompt += '     * 正确：旁白描述动作“深棕色的头发微微晃动，语气冰冷”，NPC对话只说\"带路？不，我不能。\"\n';
  prompt += '   - **常见需要旁白的情况**：\n';
  prompt += '     * 动作描写（深棕色的头发微微晃动、推开大门、拔出武器等）\n';
  prompt += '     * 神态描写（右眼的光芒收敛、微笑、皱眉、眼神变化等）\n';
  prompt += '     * 语气描写（语气冰冷而直接、声音颤抖、轻声说道等）\n';
  prompt += '     * 场景变化（突然下雨、灯光熄灭等）\n';
  prompt += '5. 不要跳出角色身份\n';
  prompt += '6. AI需要决定哪个角色出场回应（可以是任何NPC，但不能是主角）\n';
  prompt += '7. AI不能代替主角说话，主角只能由用户控制\n';
  prompt += '8. 返回语言为中文\n';
  prompt += '9. 必须使用JSON格式返回\n';
  prompt += '10. **新角色添加规则**：\n';
  prompt += '   - 如果需要引入新NPC角色，使用\"newCharacter\"类型\n';
  prompt += '   - 必须提供完整的角色数据（name, archetype, setting, traits, appearance, personality, backstory, motivation, abilities, roleInStory）\n';
  prompt += '   - 新角色数据会被自动保存到数据库，方便后续复用\n';
  prompt += '   - 可以在newCharacter响应中包含角色的首次对话（content字段）\n';

  return prompt;
}

/**
 * 构建用户提示词
 */
function buildUserPrompt(story, content) {
  const mainCharacter = story.characters.find(c => c.role === '主角');
  const mainCharacterName = mainCharacter?.name || '主角';

  let prompt = `## 🎯 用户输入\n`;
  prompt += `${mainCharacterName}说：${content}\n\n`;
  prompt += `## 🎯 AI的任务\n`;
  prompt += `请根据以上背景设定和对话历史，继续故事。\n`;
  prompt += `AI需要决定哪个角色出场回应（可以是任何NPC，但不能是主角）。\n`;
  prompt += `AI可以一次回复多条对话，由不同角色说出。\n`;
  prompt += `\n`;
  prompt += `## 🆕 新角色添加规则\n`;
  prompt += `**如果AI想要引入新的NPC角色**：\n`;
  prompt += `1. 在responses数组中添加新角色的完整数据\n`;
  prompt += `2. 新角色数据必须包含完整的角色信息（与创建故事时相同）\n`;
  prompt += `3. 新角色的type设为"newCharacter"，并提供完整的characterData字段\n`;
  prompt += `4. 新角色的对话可以单独作为一条NPC响应，也可以包含在characterData中\n`;
  prompt += `\n`;
  prompt += `## 📝 输出格式说明\n`;
  prompt += `**重要：动作、神态、语气必须用旁白，对话只包含纯文本**\n`;
  prompt += `\n`;
  prompt += `✅ **完整示例**（包含新角色添加）：\n`;
  prompt += `\`\`\`json\n`;
  prompt += `{\n`;
  prompt += `  "responses": [\n`;
  prompt += `    {\n`;
  prompt += `      "type": "旁白",\n`;
  prompt += `      "content": "一个神秘的身影从阴影中走出"\n`;
  prompt += `    },\n`;
  prompt += `    {\n`;
  prompt += `      "type": "newCharacter",\n`;
  prompt += `      "characterData": {\n`;
  prompt += `        "name": "影刃",\n`;
  prompt += `        "archetype": "刺客",\n`;
  prompt += `        "setting": "来自暗影公会的精英刺客",\n`;
  prompt += `        "traits": ["冷静", "致命", "沉默寡言"],\n`;
  prompt += `        "appearance": "黑色紧身衣，蒙面，腰间挂着两把短刃",\n`;
  prompt += `        "personality": "冷静沉着，行动果断，不轻易表露情感",\n`;
  prompt += `        "backstory": "从小在暗影公会长大，接受了严格的刺客训练，擅长暗杀和潜行",\n`;
  prompt += `        "motivation": "完成任务，维护公会的荣誉",\n`;
  prompt += `        "abilities": ["潜行", "暗杀", "格斗", "投掷"],\n`;
  prompt += `        "roleInStory": "神秘的盟友或敌人，为故事增添紧张感"\n`;
  prompt += `      },\n`;
  prompt += `      "content": "我叫影刃。看来你需要帮助。"\n`;
  prompt += `    },\n`;
  prompt += `    {\n`;
  prompt += `      "type": "NPC",\n`;
  prompt += `      "characterName": "赛琳娜",\n`;
  prompt += `      "content": "你是谁？为什么会出现在这里？"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n`;
  prompt += `\`\`\`\n`;
  prompt += `\n`;
  prompt += `❌ **错误示例**（不要这样做）：\n`;
  prompt += `\`\`\`json\n`;
  prompt += `{\n`;
  prompt += `  "responses": [\n`;
  prompt += `    {\n`;
  prompt += `      "type": "NPC",\n`;
  prompt += `      "characterName": "赛琳娜",\n`;
  prompt += `      "content": "(深棕色的头发微微晃动，语气冰冷) 带路？不，我不能。"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n`;
  prompt += `\`\`\`\n`;
  prompt += `\n`;
  prompt += `## 📝 旁白使用指南\n`;
  prompt += `**动作、神态、语气必须用旁白，不要混在对话中**\n`;
  prompt += `\n`;
  prompt += `✅ **必须使用旁白的情况**：\n`;
  prompt += `- 动作描写（深棕色的头发微微晃动、推开大门、拔出武器等）\n`;
  prompt += `- 神态描写（右眼的光芒完全收敛、微笑、皱眉、眼神变化等）\n`;
  prompt += `- 语气描写（语气变得冰冷而直接、声音颤抖、轻声说道等）\n`;
  prompt += `- 场景变化（突然下雨、灯光熄灭、地震等）\n`;
  prompt += `\n`;
  prompt += `❌ **不要滥用长段旁白**：\n`;
  prompt += `- 简单的动作可以省略（如：点头、摇头）\n`;
  prompt += `- 不要在每次对话前都加长段旁白\n`;
  prompt += `- 只在重要时刻使用旁白\n`;
  prompt += `\n`;
  prompt += `**重要原则**：\n`;
  prompt += `- **动作神态用旁白**：括号中的内容都应该移到旁白\n`;
  prompt += `- **对话是纯文本**：NPC的对话内容应该是纯文本，不包含任何括号或动作\n`;
  prompt += `- **简洁为王**：旁白应该简洁，不要长篇大论\n`;
  prompt += `- **自然流畅**：重要的动作才用旁白，普通对话不需要\n`;
  prompt += `\n`;
  prompt += `请严格按照以下JSON格式返回：\n`;
  prompt += `\`\`\`json\n`;
  prompt += `{\n`;
  prompt += `  "responses": [\n`;
  prompt += `    {\n`;
  prompt += `      "type": "旁白",  // 描述动作、神态、语气\n`;
  prompt += `      "content": "简短的动作或神态描述"\n`;
  prompt += `    },\n`;
  prompt += `    {\n`;
  prompt += `      "type": "NPC",\n`;
  prompt += `      "characterName": "角色名（必须填写，不能为空）",\n`;
  prompt += `      "content": "纯文本对话（必须填写，不能为空，不包含括号）"\n`;
  prompt += `    },\n`;
  prompt += `    {\n`;
  prompt += `      "type": "newCharacter",  // 新增角色时使用\n`;
  prompt += `      "characterData": {  // 完整的角色数据\n`;
  prompt += `        "name": "角色名",\n`;
  prompt += `        "archetype": "角色原型",\n`;
  prompt += `        "setting": "角色背景/出身",\n`;
  prompt += `        "traits": ["特质1", "特质2"],\n`;
  prompt += `        "appearance": "外貌描述",\n`;
  prompt += `        "personality": "性格描述",\n`;
  prompt += `        "backstory": "背景故事",\n`;
  prompt += `        "motivation": "动机/目标",\n`;
  prompt += `        "abilities": ["能力1", "能力2"],\n`;
  prompt += `        "roleInStory": "在故事中的作用"\n`;
  prompt += `      },\n`;
  prompt += `      "content": "角色的对话内容（可选）"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n`;
  prompt += `\`\`\`\n\n`;
  prompt += `重要规则：\n`;
  prompt += `1. 必须返回JSON格式，包含responses数组\n`;
  prompt += `2. type只能是"旁白"、"NPC"或"newCharacter"\n`;
  prompt += `3. NPC对话必须包含characterName字段（不能为空）\n`;
  prompt += `4. 旁白不需要characterName字段，但必须有content字段（不能为空）\n`;
  prompt += `5. 不能代替主角说话（主角只能由用户控制）\n`;
  prompt += `6. NPC对话不能放在旁白里\n`;
  prompt += `7. **所有content字段都必须填写，不能为null或空字符串**\n`;
  prompt += `8. **动作、神态、语气必须用旁白，不要混在对话中**\n`;
  prompt += `9. **新增角色时，使用newCharacter类型并提供完整的characterData**\n`;

  return prompt;
}

/**
 * 解析AI响应（JSON格式）
 * 返回 { success: boolean, responses: array, error: string|null }
 */
function parseAIResponse(content) {
  const results = [];

  // 尝试从响应中提取JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const responseData = JSON.parse(jsonMatch[1]);
      if (responseData.responses && Array.isArray(responseData.responses)) {
        for (const response of responseData.responses) {
          if (response.type === '旁白' && response.content) {
            results.push({
              type: '旁白',
              content: response.content
            });
          } else if (response.type === 'NPC' && response.characterName && response.content) {
            results.push({
              type: 'NPC',
              characterName: response.characterName,
              content: response.content
            });
          } else if (response.type === 'newCharacter' && response.characterData) {
            // 新角色类型：包含完整的角色数据
            results.push({
              type: 'newCharacter',
              characterData: response.characterData,
              content: response.content || null
            });
          }
        }
        return { success: true, responses: results, error: null };
      }
    } catch (e) {
      return { success: false, responses: [], error: `JSON解析失败: ${e.message}` };
    }
  }

  // 如果没有找到代码块格式，尝试直接解析
  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const responseData = JSON.parse(braceMatch[0]);
      if (responseData.responses && Array.isArray(responseData.responses)) {
        for (const response of responseData.responses) {
          if (response.type === '旁白' && response.content) {
            results.push({
              type: '旁白',
              content: response.content
            });
          } else if (response.type === 'NPC' && response.characterName && response.content) {
            results.push({
              type: 'NPC',
              characterName: response.characterName,
              content: response.content
            });
          } else if (response.type === 'newCharacter' && response.characterData) {
            // 新角色类型：包含完整的角色数据
            results.push({
              type: 'newCharacter',
              characterData: response.characterData,
              content: response.content || null
            });
          }
        }
        return { success: true, responses: results, error: null };
      }
    } catch (e) {
      return { success: false, responses: [], error: `JSON解析失败: ${e.message}` };
    }
  }

  // JSON解析失败，回退到旧的文本解析方式
  const lines = content.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('旁白：') || line.startsWith('【旁白】') || line.includes('故事发生在')) {
      const narration = line.replace(/^旁白：|【旁白】/g, '').trim();
      if (narration) {
        results.push({
          type: '旁白',
          content: narration
        });
      }
    } else if (line.match(/^[\\w\\u4e00-\\u9fa5]+[:：]/)) {
      const match = line.match(/^([\\w\\u4e00-\\u9fa5]+)[:：](.+)$/);
      if (match) {
        const characterName = match[1].trim();
        const dialogContent = match[2].trim();
        results.push({
          type: 'NPC',
          characterName: characterName,
          content: dialogContent
        });
      }
    } else if (line.trim()) {
      results.push({
        type: '旁白',
        content: line.trim()
      });
    }
  }

  // 文本解析也没有结果，返回错误
  if (results.length === 0) {
    return { success: false, responses: [], error: '无法解析AI响应格式' };
  }

  return { success: true, responses: results, error: null };
}

/**
 * 保存消息
 */
async function saveMessage(storyId, messageData) {
  const story = await Story.findById(storyId);
  if (!story) return;

  story.messages.push(messageData);
  story.metadata.lastMessageAt = new Date();
  story.metadata.totalMessages = (story.metadata.totalMessages || 0) + 1;

  await story.save();
}

module.exports = {
  getUserIdFromToken,
  buildStoryDataPrompt,
  buildStoryOpeningPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  parseAIResponse,
  saveMessage
};
