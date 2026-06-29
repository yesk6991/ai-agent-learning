# LangChain RAG 实现方案

## 💡 学习要点：生产级 RAG vs 本地 RAG

本目录提供了基于 LangChain.js 的 RAG 实现方案，与 `local/` 目录的本地实现做对比学习。

## 对比总结

| 维度 | 本地实现 (local/) | LangChain 实现 |
|------|-------------------|----------------|
| Embedding | TF-IDF（词频） | OpenAI Embeddings（语义） |
| 向量存储 | 内存数组 | Chroma / Pinecone |
| 分块策略 | 手写固定+语义 | LangChain RecursiveCharacterTextSplitter |
| 检索 | 全量余弦相似度 | ANN 近似最近邻 |
| 语义理解 | ❌ "开心"≠"快乐" | ✅ 语义相近 |
| 成本 | 零成本 | OpenAI API 调用费用 |
| 依赖 | 零外部依赖 | langchain, @langchain/openai, chromadb |
| 适用场景 | 学习 RAG 原理 | 生产级应用 |

## 实现方案

```javascript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from 'langchain/chains';

// 1. 文档分块（LangChain 内置，支持 Markdown 标题感知）
const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
  chunkSize: 500,
  chunkOverlap: 50,
});

// 2. 向量化 + 存储（一行搞定本地实现中的 embedder + store）
const vectorStore = await Chroma.fromDocuments(docs, new OpenAIEmbeddings());

// 3. 检索 + 生成（一行搞定 retrieve + prompt + callLLM）
const chain = RetrievalQAChain.fromLLM(
  new ChatOpenAI({ model: 'gpt-4' }),
  vectorStore.asRetriever(3),
);

// 4. 查询
const result = await chain.call({ query: '什么是 RAG？' });
```

## 安装依赖

```bash
npm install langchain @langchain/openai @langchain/community chromadb
```

## 需要的 API Key

- `OPENAI_API_KEY` - 用于 Embeddings 和 Chat 模型
- 或者替换为其他 LangChain 支持的模型

## 何时选择 LangChain？

- ✅ 项目需要语义级检索（TF-IDF 不够用时）
- ✅ 知识库规模较大（1000+ 文档块）
- ✅ 需要持久化向量存储（Chroma/Pinecone）
- ✅ 需要多种检索策略（MMR、相似度+关键词混合）

## 何时用本地方案就够了？

- ✅ 学习 RAG 原理（零依赖，代码清晰）
- ✅ 小规模知识库（<100 文档块）
- ✅ 不想引入额外 API 成本
- ✅ 快速原型验证
