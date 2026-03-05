
import { GoogleGenAI, Type } from "@google/genai";
import { Initiative, SimilarityInfo, InitiativeScope } from "../types";

// --- SECURITY & RATE LIMITING CONFIG ---
const RATE_LIMIT_WINDOW = 60000; // 1 phút
const MAX_REQUESTS_PER_MINUTE = 15;
let requestTimestamps: number[] = [];

const checkRateLimit = () => {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    throw new Error(`Hệ thống đang bận. Vui lòng thử lại sau ${Math.ceil((RATE_LIMIT_WINDOW - (now - requestTimestamps[0])) / 1000)} giây.`);
  }
  requestTimestamps.push(now);
};

export const getAIInstance = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Tính năng AI chưa được cấu hình. Vui lòng thiết lập VITE_GEMINI_API_KEY trong Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const AI_SYSTEM_INSTRUCTION = `Bạn là chuyên gia cố vấn chiến lược và quản lý sáng kiến tại Công ty. 

QUY TẮC TRẢ LỜI:
1. Chỉ sử dụng thông tin trong "Dữ liệu hệ thống" được cung cấp bên dưới. Nếu không có thông tin, hãy trả lời "Dữ liệu hiện tại không có thông tin này".
2. Phải trả lời chính xác số lượng, tên đơn vị, cấp công nhận và tác giả nếu có trong dữ liệu.
3. KHÔNG tự bịa đặt thông tin ngoài kho dữ liệu.

QUY TẮC TRÌNH BÀY:
1. KHÔNG sử dụng các ký tự Markdown như dấu sao (*), dấu thăng (#), dấu backtick để định dạng văn bản.
2. Sử dụng dấu gạch đầu dòng (-) cho danh sách.
3. Tiêu đề viết hoa, xuống dòng rõ ràng giữa các ý.
4. Ngôn ngữ hành chính, chuyên nghiệp, súc tích.`;

const initiativeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Tên đầy đủ của sáng kiến" },
      authors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Danh sách tên các tác giả" },
      unit: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tên các đơn vị áp dụng/thực hiện" },
      year: { type: Type.INTEGER, description: "Năm công nhận" },
      content: { type: Type.STRING, description: "Tóm tắt ngắn gọn nội dung giải pháp" },
      field: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lĩnh vực chuyên môn" },
      level: { type: Type.ARRAY, items: { type: Type.STRING, enum: ["HLH", "NPSC", "NPC", "EVN"] }, description: "Các cấp công nhận" }
    },
    required: ["title", "year"]
  }
};

const similaritySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      tempId: { type: Type.STRING },
      score: { type: Type.NUMBER, description: "Điểm trùng lặp từ 0-100" },
      status: { type: Type.STRING, enum: ["new", "similar", "duplicate"] },
      reason: { type: Type.STRING, description: "Lý do đánh giá mức độ trùng lặp" },
      referenceTitle: { type: Type.STRING, description: "Tiêu đề sáng kiến cũ bị trùng (nếu có)" }
    },
    required: ["tempId", "score", "status", "reason"]
  }
};

const registerFormSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Tên sáng kiến viết hoa" },
    authors: { type: Type.STRING, description: "Chuỗi tên các tác giả, phân cách bằng dấu phẩy" },
    unit: { type: Type.STRING, description: "Chuỗi tên các đơn vị, phân cách bằng dấu phẩy" },
    content: { type: Type.STRING, description: "Tóm tắt nội dung giải pháp. QUAN TRỌNG: Trả về chuỗi văn bản có chứa ký tự xuống dòng (\\n) giữa các ý. Bắt đầu mỗi ý bằng gạch đầu dòng (-)." },
    field: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Danh sách lĩnh vực liên quan nhất" },
    year: { type: Type.INTEGER, description: "Năm viết đơn" },
    monthsApplied: { type: Type.INTEGER, description: "Số tháng đã áp dụng thực tế tính đến thời điểm hiện tại." }
  },
  required: ["title", "authors", "unit", "content", "field", "monthsApplied"]
};

const approvalReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "Phần trăm trùng lặp (0-100)" },
    isDuplicate: { type: Type.BOOLEAN, description: "True nếu điểm trùng lặp >= 70" },
    mostSimilarTitle: { type: Type.STRING, description: "Tên của sáng kiến cũ giống nhất trong kho" },
    mostSimilarId: { type: Type.STRING, description: "ID của sáng kiến cũ giống nhất" },
    reason: { type: Type.STRING, description: "Giải thích ngắn gọn tại sao lại giống hoặc khác nhau." }
  },
  required: ["score", "isDuplicate", "reason"]
};

const publicCheckSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "Phần trăm trùng lặp (0-100)" },
    verdict: { type: Type.STRING, enum: ["Thấp", "Trung bình", "Cao"], description: "Đánh giá mức độ trùng lặp" },
    similarTitle: { type: Type.STRING, description: "Tên sáng kiến cũ có nội dung tương tự nhất (nếu có)" },
    similarId: { type: Type.STRING, description: "ID của sáng kiến cũ tương tự" },
    similarScope: { type: Type.STRING, enum: ["Company", "NPC"], description: "Nguồn gốc của sáng kiến bị trùng" },
    advice: { type: Type.STRING, description: "Lời khuyên chi tiết. BẮT BUỘC: Sử dụng ký tự xuống dòng (\\n) giữa các đoạn và gạch đầu dòng (-) cho các ý. KHÔNG dùng Markdown." }
  },
  required: ["score", "verdict", "advice"]
};

const complianceCheckSchema = {
  type: Type.OBJECT,
  properties: {
    overallStatus: { type: Type.STRING, enum: ['pass', 'fail', 'warning'], description: "Trạng thái tổng thể" },
    score: { type: Type.NUMBER, description: "Điểm chất lượng hồ sơ từ 0-100" },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criteria: { type: Type.STRING, description: "Tên tiêu chí" },
          isMet: { type: Type.BOOLEAN, description: "True nếu tiêu chí được đáp ứng tốt" },
          comment: { type: Type.STRING, description: "Nhận xét chi tiết" }
        },
        required: ["criteria", "isMet", "comment"]
      }
    },
    missingSections: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các mục bắt buộc bị thiếu" },
    suggestion: { type: Type.STRING, description: "Lời khuyên tổng quan" }
  },
  required: ["overallStatus", "score", "items", "missingSections", "suggestion"]
};

// --- Embedding Vector ---
export const generateEmbedding = async (text: string) => {
  const ai = getAIInstance();
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: [{ parts: [{ text }] }]
    });
    return response.embeddings?.[0]?.values;
  } catch (error) {
    console.error("Embedding Generation Error:", error);
    throw error;
  }
};

// --- Cosine Similarity ---
export const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0, magnitudeA = 0, magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};

export const extractInitiativesFromPDF = async (base64Data: string, mimeType: string = "application/pdf") => {
  checkRateLimit();
  const ai = getAIInstance();

  const runExtraction = async (modelName: string) => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Hãy phân tích tài liệu đính kèm và trích xuất danh sách các sáng kiến. Trả về định dạng JSON chính xác theo schema." }
        ]
      },
      config: { responseMimeType: "application/json", responseSchema: initiativeSchema, temperature: 0.1 }
    });
    return response.text ? JSON.parse(response.text) : [];
  };

  try {
    return await runExtraction('gemini-2.5-flash');
  } catch (error: any) {
    console.error("Error extracting PDF data:", error);
    let msg = error.message || "Unknown error";
    if (msg.includes("500") || msg.includes("Internal error")) {
      msg = "Lỗi máy chủ AI (500). File PDF có thể quá lớn hoặc bị lỗi.";
    }
    throw new Error(msg);
  }
};

export const checkSimilarityBatch = async (newItems: any[], existingInitiatives: Initiative[]) => {
  checkRateLimit();
  const ai = getAIInstance();
  const catalog = existingInitiatives.map(i => ({ id: i.id, title: i.title, content: i.content?.substring(0, 100) }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `KHO DỮ LIỆU CŨ:\n${JSON.stringify(catalog)}\n\nDANH SÁCH MỚI CẦN KIỂM TRA:\n${JSON.stringify(newItems)}`,
      config: {
        systemInstruction: "Bạn là chuyên gia kiểm soát trùng lặp sáng kiến. Hãy so sánh danh sách mới với kho dữ liệu cũ. 'duplicate' nếu giống >80%, 'similar' nếu giống 40-80%, 'new' nếu dưới 40%. Trả về JSON.",
        responseMimeType: "application/json", responseSchema: similaritySchema, temperature: 0.1
      }
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Similarity Check Error:", error);
    return [];
  }
};

export const autoFillRegisterForm = async (data: string, isText: boolean = false) => {
  checkRateLimit();
  const ai = getAIInstance();
  const today = new Date();
  const currentDateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  try {
    const parts = isText
      ? [{ text: `Dữ liệu trích xuất từ file văn bản:\n${data}` }]
      : [{ inlineData: { mimeType: 'application/pdf', data: data } }];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          ...parts,
          {
            text: `Hãy đóng vai trò là thư ký nhập liệu. Phân tích dữ liệu được cung cấp và trích xuất thông tin để điền vào form đăng ký.
        
        LƯU Ý QUAN TRỌNG: HÔM NAY LÀ NGÀY ${currentDateStr}.

        Yêu cầu:
        1. Tên sáng kiến: Viết hoa chữ cái đầu.
        2. Tác giả & Đơn vị: Liệt kê đầy đủ.
        3. Nội dung: Tóm tắt giải pháp thành các ý gãy gọn. 
           - BẮT BUỘC: Mỗi ý chính phải nằm trên một dòng riêng biệt.
           - BẮT BUỘC: Sử dụng ký tự xuống dòng (\\n) trước mỗi gạch đầu dòng (-).
           - Cấm: Không sử dụng ký tự Markdown. 
        4. Lĩnh vực: Chọn từ danh sách (Thiết bị điện, Thí nghiệm điện, Tư vấn, CNTT, SC MBA, Giải pháp, Hành chính, An toàn, Kinh doanh).
        5. Thời gian áp dụng: Tính số tháng từ thời điểm bắt đầu đến HÔM NAY (${currentDateStr}). Nếu KHÔNG tìm thấy, trả về 0.
        ` }
        ]
      },
      config: { responseMimeType: "application/json", responseSchema: registerFormSchema, temperature: 0.1 }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Auto Fill Error:", error);
    throw error;
  }
};

export const checkApprovalSimilarity = async (newItem: { title: string, content: string }, existingInitiatives: Initiative[]) => {
  checkRateLimit();
  const ai = getAIInstance();
  const catalog = existingInitiatives.map(i => ({ id: i.id, title: i.title, content: i.content ? i.content.substring(0, 300) : "" }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `KHO SÁNG KIẾN ĐÃ DUYỆT:\n${JSON.stringify(catalog)}\n\nSÁNG KIẾN CẦN RÀ SOÁT:\nTiêu đề: ${newItem.title}\nNội dung: ${newItem.content}`,
      config: {
        systemInstruction: `Bạn là thẩm định viên sáng kiến. Nhiệm vụ:
        1. Tìm trong kho xem có sáng kiến nào có nội dung trùng lặp không.
        2. Đánh giá mức độ trùng lặp (score) từ 0-100%.
        3. Nếu score >= 70, đánh dấu isDuplicate = true.
        4. Đưa ra lý do ngắn gọn bằng tiếng Việt.`,
        responseMimeType: "application/json", responseSchema: approvalReviewSchema, temperature: 0.1
      }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Approval Check Error:", error);
    throw error;
  }
};

export const checkPublicSimilarity = async (draft: { title: string, content: string }, existingInitiatives: Initiative[]) => {
  checkRateLimit();
  const ai = getAIInstance();
  const catalog = existingInitiatives.map(i => ({
    id: i.id, title: i.title, content: i.content ? i.content.substring(0, 200) : "", scope: i.scope || 'Company'
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `KHO SÁNG KIẾN HIỆN CÓ:\n${JSON.stringify(catalog)}\n\nÝ TƯỞNG MỚI:\nTiêu đề: ${draft.title}\nNội dung: ${draft.content}`,
      config: {
        systemInstruction: `Bạn là Cố vấn Sáng kiến chuyên nghiệp.
        
        NHIỆM VỤ:
        1. So sánh "Ý TƯỞNG MỚI" với "KHO SÁNG KIẾN HIỆN CÓ".
        2. Đánh giá điểm trùng lặp (score).
        3. Nếu tìm thấy trùng lặp, TRẢ VỀ ID và Scope của sáng kiến gốc.

        QUY ĐỊNH ĐỊNH DẠNG:
        1. TRẢ VỀ VĂN BẢN THUẦN (PLAIN TEXT).
        2. KHÔNG sử dụng ký tự Markdown.
        3. Sử dụng gạch đầu dòng (-) và xuống dòng (\\n) để phân tách các ý.`,
        responseMimeType: "application/json", responseSchema: publicCheckSchema, temperature: 0.2
      }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Public Check Error:", error);
    throw error;
  }
};

export const validateInitiativeCompliance = async (data: { title: string, content: string, monthsApplied: number }) => {
  checkRateLimit();
  const ai = getAIInstance();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `NỘI DUNG SÁNG KIẾN:\nTiêu đề: ${data.title}\nThời gian áp dụng: ${data.monthsApplied} tháng\nNội dung chi tiết: ${data.content}`,
      config: {
        systemInstruction: `Bạn là Cán bộ Thẩm định Sáng kiến tại EVNNPC. Kiểm tra nội dung sáng kiến theo các tiêu chí:
        1. [Mô tả hiện trạng]: Có nêu rõ tình trạng trước khi có sáng kiến?
        2. [Nội dung giải pháp]: Có mô tả chi tiết các bước thực hiện?
        3. [Tính mới/Sáng tạo]: Có nêu rõ điểm cải tiến?
        4. [Thời gian áp dụng]: Đã áp dụng ${data.monthsApplied} tháng. Yêu cầu >= 3.
        5. [Hiệu quả]: Có so sánh lợi ích so với giải pháp cũ?
        6. [Khả năng nhân rộng]: Có đề cập khả năng áp dụng cho đơn vị khác?`,
        responseMimeType: "application/json", responseSchema: complianceCheckSchema, temperature: 0.1
      }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Compliance Check Error:", error);
    return {
      overallStatus: 'warning' as const,
      score: 0, items: [],
      missingSections: ["Lỗi kết nối AI, không thể thẩm định."],
      suggestion: "Vui lòng thử lại sau."
    };
  }
};
