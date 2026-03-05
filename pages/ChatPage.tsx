
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Sparkles, BrainCircuit, AlertTriangle } from 'lucide-react';
import { getAIInstance, AI_SYSTEM_INSTRUCTION, generateEmbedding, cosineSimilarity } from '../services/aiService';
import { ChatMessage, Initiative } from '../types';
import { useApp } from '../contexts/AppContext';

interface ChatPageProps {
  initiatives: Initiative[];
  activeTheme: any;
}

const ChatPage: React.FC<ChatPageProps> = ({ initiatives, activeTheme }) => {
  const { geminiApiKey } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Chào mừng bạn đến với NPC-Innovation.\nTôi đã sẵn sàng tra cứu dữ liệu từ ' + initiatives.length + ' hồ sơ sáng kiến.\nBạn cần tìm hiểu thông tin gì?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false); // Trạng thái RAG
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const newMsgs: ChatMessage[] = [...messages, { role: 'user', text: input }];
    setMessages(newMsgs);
    setInput('');
    setIsTyping(true);
    setIsRetrieving(true);

    try {
      // ---------------------------------------------------------
      // BƯỚC 1: HYBRID RETRIEVAL (TÌM KIẾM KẾT HỢP)
      // Kết hợp Keyword Search (tìm chính xác) + Vector Search (tìm theo ý nghĩa)
      // ---------------------------------------------------------

      let context = "";
      let relevantCount = 0;
      const lowerInput = input.toLowerCase().trim();

      // 1.1 Keyword Search (Ưu tiên tuyệt đối cho tên người, đơn vị, năm)
      // Lọc nhanh các bản ghi có chứa từ khóa
      const keywordMatches = initiatives.filter(i => {
        const authors = Array.isArray(i.authors) ? i.authors.join(' ') : (i.authors || '');
        const units = Array.isArray(i.unit) ? i.unit.join(' ') : (i.unit || '');
        const textData = `${i.title} ${authors} ${units} ${i.year}`.toLowerCase();
        return textData.includes(lowerInput);
      }).map(item => ({ item, score: 1.0, type: 'keyword' }));

      // 1.2 Vector Search (Tìm kiếm ngữ nghĩa cho các câu hỏi phức tạp)
      let vectorMatches: { item: Initiative; score: number; type: string }[] = [];
      try {
        const queryVector = await generateEmbedding(input);

        if (queryVector) {
          vectorMatches = initiatives.map(item => {
            if (!item.embedding_field) return { item, score: 0, type: 'vector' };
            return {
              item,
              score: cosineSimilarity(queryVector, item.embedding_field),
              type: 'vector'
            };
          }).filter(x => x.score > 0.35); // Hạ ngưỡng xuống 0.35 để bắt được nhiều ngữ cảnh hơn
        }
      } catch (vectorError) {
        console.warn("Vector search failed, falling back to keyword only:", vectorError);
      }

      // 1.3 Merge Results (Gộp kết quả và loại bỏ trùng lặp)
      const combinedResults = new Map<string, { item: Initiative; score: number }>();

      // Thêm keyword matches trước (Score cao nhất)
      keywordMatches.forEach(m => {
        combinedResults.set(m.item.id, m);
      });

      // Thêm vector matches (nếu chưa có)
      vectorMatches.forEach(m => {
        if (!combinedResults.has(m.item.id)) {
          combinedResults.set(m.item.id, m);
        }
      });

      // Chuyển về mảng và sắp xếp theo điểm số
      const finalRanked = Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 30); // Lấy Top 30 kết quả tốt nhất

      relevantCount = finalRanked.length;

      // 1.4 Xây dựng Context
      if (relevantCount > 0) {
        context = finalRanked.map(match => {
          const i = match.item;
          const units = Array.isArray(i.unit) ? i.unit.join(', ') : i.unit;
          const authors = Array.isArray(i.authors) ? i.authors.join(', ') : i.authors;
          // Lấy nội dung dài hơn để AI có đủ thông tin
          const contentPreview = i.content ? i.content.substring(0, 800) : 'Không có tóm tắt';

          return `DATA_ITEM (Độ phù hợp ${match.score.toFixed(2)}): 
              - ID: "${i.id}"
              - Năm: ${i.year}
              - Cấp: ${i.level?.join(', ')}
              - Đơn vị: "${units}"
              - Tác giả: "${authors}"
              - Tiêu đề: "${i.title}"
              - Nội dung: "${contentPreview}"`;
        }).join('\n\n');
      }

      setIsRetrieving(false); // Xong bước tìm kiếm

      // ---------------------------------------------------------
      // BƯỚC 2: GENERATION (GỬI CHO AI TRẢ LỜI)
      // ---------------------------------------------------------

      const ai = getAIInstance();

      // Nếu vẫn không tìm thấy gì cả (cả keyword lẫn vector đều tạch)
      if (!context) {
        setMessages([...newMsgs, {
          role: 'model',
          text: `Tôi đã rà soát dữ liệu nhưng không tìm thấy thông tin nào khớp với "${input}".\nBạn thử kiểm tra lại chính tả tên tác giả hoặc đơn vị xem sao nhé.`
        }]);
        setIsTyping(false);
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `CONTEXT DỮ LIỆU ĐÃ LỌC (HYBRID RAG RETRIEVED):\n${context}\n\nCÂU HỎI NGƯỜI DÙNG: "${input}"`,
        config: {
          systemInstruction: AI_SYSTEM_INSTRUCTION + `\n\nLƯU Ý QUAN TRỌNG:\n1. Dữ liệu trên là danh sách các sáng kiến có liên quan nhất (tìm thấy ${relevantCount} kết quả).\n2. Nếu người dùng hỏi về một người (Tác giả), hãy liệt kê các sáng kiến mà người đó tham gia (dựa vào trường Tác giả).\n3. Nếu người dùng hỏi về một chủ đề, hãy tổng hợp thông tin.\n4. Nếu trong danh sách Context KHÔNG có thông tin chính xác người dùng hỏi, hãy nói rõ là chưa tìm thấy trong kho dữ liệu hiện tại.`,
          temperature: 0.2
        }
      });

      setMessages([...newMsgs, {
        role: 'model',
        text: response.text || "Xin lỗi, tôi không thể phân tích thông tin này.",
        isRag: relevantCount > 0
      }]);

    } catch (e: any) {
      console.error("AI Error:", e);
      setMessages([...newMsgs, { role: 'model', text: `Lỗi hệ thống: ${e.message}. Vui lòng thử lại.` }]);
    } finally {
      setIsTyping(false);
      setIsRetrieving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col h-[85vh] overflow-hidden">
      <div className="p-6 lg:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center gap-5 bg-slate-50/50 dark:bg-slate-800/30">
        <div className={`${activeTheme.primary} p-4 rounded-2xl text-white shadow-lg`}><Bot size={28} /></div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Trợ lý AI NPC-Innovation</h3>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><BrainCircuit size={10} className="text-emerald-500" /> Hybrid RAG Engine Active</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 custom-scrollbar">
        {!geminiApiKey && (
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 animate-pulse">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><AlertTriangle size={24} /></div>
            <div>
              <p className="text-xs font-black uppercase text-rose-600 tracking-widest">Tính năng AI đang bị khóa</p>
              <p className="text-[10px] font-bold text-rose-500">Vui lòng yêu cầu Quản trị viên cấu hình Gemini API Key riêng cho đơn vị để sử dụng trợ lý AI.</p>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide`}>
            <div className={`max-w-[85%] lg:max-w-[75%] p-5 lg:p-7 rounded-[2.5rem] font-medium whitespace-pre-wrap shadow-sm relative ${msg.role === 'user' ? `${activeTheme.primary} text-white rounded-tr-none` : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'}`}>
              {msg.text}
              {msg.isRag && msg.role === 'model' && (
                <div className="absolute -bottom-5 left-4 flex items-center gap-1 text-[8px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                  <Sparkles size={8} /> Trả lời từ dữ liệu tìm kiếm
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Status Indicator */}
        {(isTyping || isRetrieving) && (
          <div className={`${activeTheme.text} animate-pulse font-black px-6 flex items-center gap-3 text-[10px] uppercase tracking-widest`}>
            <Loader2 className="animate-spin" size={14} />
            {isRetrieving ? 'Đang quét dữ liệu (Keyword + Vector)...' : 'Đang tổng hợp câu trả lời...'}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-6 lg:p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={geminiApiKey ? "Hỏi về tên tác giả, đơn vị hoặc nội dung sáng kiến..." : "Vui lòng cấu hình API Key để sử dụng..."}
            className="w-full pl-8 pr-14 py-5 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-[2.5rem] outline-none font-bold disabled:opacity-50"
            disabled={isTyping || !geminiApiKey}
          />
          <button onClick={handleSend} disabled={isTyping || !geminiApiKey} className={`absolute right-2 top-1/2 -translate-y-1/2 ${activeTheme.primary} p-3 rounded-full text-white shadow-lg disabled:opacity-50`}><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
