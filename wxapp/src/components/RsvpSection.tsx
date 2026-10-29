import React, { useState } from 'react';
import { GuestRSVP } from '../types/wedding';
import { Send, CheckCircle2, User, Phone, Users, Utensils, Bus, Sparkles, Smartphone, Car, Check } from 'lucide-react';
import { weChatGetPhone } from '../utils/notionService';

interface RsvpSectionProps {
  themePrimary: string;
  onAddRsvp: (rsvp: GuestRSVP) => void;
  guestName?: string;
  guestBlessing?: string;
}

export const RsvpSection: React.FC<RsvpSectionProps> = ({
  themePrimary,
  onAddRsvp,
  guestName = '',
  guestBlessing = '',
}) => {
  const [name, setName] = useState(guestName);
  const [phone, setPhone] = useState('');
  const [attending, setAttending] = useState<'yes' | 'no'>('yes');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [dietary, setDietary] = useState<'standard' | 'vegetarian' | 'halal' | 'child'>('standard');
  const [needsShuttle, setNeedsShuttle] = useState(false);
  const [blessing, setBlessing] = useState(guestBlessing);
  const [submitted, setSubmitted] = useState(false);
  const [isPhoneAuthDialogShow, setIsPhoneAuthDialogShow] = useState(false);
  const [isPhoneAuthorized, setIsPhoneAuthorized] = useState(false);

  // 当外部guestName或guestBlessing发生改变时同步（若当前尚未提交）
  React.useEffect(() => {
    if (guestName && !name) {
      setName(guestName);
    }
  }, [guestName]);

  React.useEffect(() => {
    if (guestBlessing && !blessing) {
      setBlessing(guestBlessing);
    }
  }, [guestBlessing]);

  const handleConfirmPhoneAuth = async () => {
    const res = await weChatGetPhone('sample_phone_code_' + Date.now());
    const authorizedPhone = res.phoneNumber || '13888888888';
    setPhone(authorizedPhone);
    setIsPhoneAuthorized(true);
    setIsPhoneAuthDialogShow(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRsvp: GuestRSVP = {
      id: `rsvp-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '未填写',
      attending,
      guestCount: attending === 'yes' ? guestCount : 0,
      dietary,
      needsShuttle,
      blessing: blessing.trim() || '祝新人百年好合，新婚快乐！',
      submittedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    onAddRsvp(newRsvp);
    setSubmitted(true);
  };

  const handleReset = () => {
    setName('');
    setPhone('');
    setAttending('yes');
    setGuestCount(1);
    setDietary('standard');
    setNeedsShuttle(false);
    setBlessing('');
    setSubmitted(false);
  };

  return (
    <section id="rsvp-anchor" className="my-8">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-[0.25em] text-stone-400 font-serif">
          RSVP &amp; Attendance
        </span>
        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          宾客回执 · 席位确认
        </h2>
        <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ backgroundColor: themePrimary }} />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/60">
        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-3" />
            <h3 className="text-lg font-serif font-bold text-stone-900 mb-1">
              感谢您的热情回执！
            </h3>
            <p className="text-xs text-stone-600 mb-5 leading-relaxed">
              我们已收到您的席位信息与美好祝福，已实时同步至新人的 Notion 数据库，期待与您欢聚！
            </p>
            <button
              onClick={handleReset}
              className="text-xs px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
            >
              重新填写回执
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 是否出席 */}
            <div>
              <label className="block font-semibold text-stone-800 mb-2 font-serif">您是否能出席本次婚礼喜宴？</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAttending('yes')}
                  className={`py-2.5 px-3 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    attending === 'yes'
                      ? 'border-transparent text-white shadow-sm font-bold'
                      : 'border-stone-200 bg-stone-50 text-stone-600'
                  }`}
                  style={{ backgroundColor: attending === 'yes' ? themePrimary : undefined }}
                >
                  <CheckCircle2 className="h-4 w-4 inline mr-1" />
                  <span>准时赴约出席</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttending('no')}
                  className={`py-2.5 px-3 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    attending === 'no'
                      ? 'bg-stone-800 text-white border-transparent font-bold'
                      : 'border-stone-200 bg-stone-50 text-stone-600'
                  }`}
                >
                  遗憾无法到场
                </button>
              </div>
            </div>

            {/* 姓名与联系电话 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-stone-400" />
                    <span>您的姓名 / 称谓 *</span>
                  </span>
                  {guestName && name === guestName && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      已自动带入题名
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：张明 / 李华携家眷"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#8B1E1E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-stone-400" />
                    <span>联系电话</span>
                  </span>
                  {isPhoneAuthorized && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>微信已授权</span>
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="便于座位信息提醒"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 rounded-xl border border-stone-200 p-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#8B1E1E]"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPhoneAuthDialogShow(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
                    title="微信原生一键获取手机号"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>微信授权</span>
                  </button>
                </div>
              </div>
            </div>

            {attending === 'yes' && (
              <>
                {/* 出席人数 */}
                <div>
                  <label className="block font-semibold text-stone-800 mb-1.5 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-stone-400" />
                    <span>预计出席总人数</span>
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setGuestCount(num)}
                        className={`flex-1 py-2 rounded-lg font-mono font-bold text-center border transition-colors cursor-pointer ${
                          guestCount === num
                            ? 'text-white border-transparent'
                            : 'border-stone-200 bg-stone-50 text-stone-700'
                        }`}
                        style={{ backgroundColor: guestCount === num ? themePrimary : undefined }}
                      >
                        {num}{num === 5 ? '+' : ''}人
                      </button>
                    ))}
                  </div>
                </div>

                {/* 用餐偏好 */}
                <div>
                  <label className="block font-semibold text-stone-800 mb-1.5 flex items-center gap-1">
                    <Utensils className="h-3.5 w-3.5 text-stone-400" />
                    <span>特殊餐食偏好</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'standard', label: '标准荤席' },
                      { id: 'vegetarian', label: '素食专席' },
                      { id: 'halal', label: '清真要求' },
                      { id: 'child', label: '需宝宝椅' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setDietary(item.id as typeof dietary)}
                        className={`py-1.5 px-1 rounded-lg text-center border text-[11px] truncate transition-colors cursor-pointer ${
                          dietary === item.id
                            ? 'border-stone-700 bg-stone-800 text-white font-bold'
                            : 'border-stone-200 bg-stone-50 text-stone-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 是否需要大巴 */}
                <div>
                  <label className="block font-semibold text-stone-800 mb-1.5 flex items-center gap-1">
                    <Bus className="h-3.5 w-3.5 text-stone-400" />
                    <span>婚礼接送大巴服务</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNeedsShuttle(true)}
                      className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        needsShuttle
                          ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-600'
                      }`}
                    >
                      <Bus className="h-3.5 w-3.5" />
                      <span>需要定点大巴接送</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNeedsShuttle(false)}
                      className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        !needsShuttle
                          ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-600'
                      }`}
                    >
                      <Car className="h-3.5 w-3.5" />
                      <span>自驾前往 / 无需接送</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 祝福心语 */}
            <div>
              <label className="block font-semibold text-stone-800 mb-1.5 font-serif">对新人的婚礼祝福</label>
              <textarea
                rows={2}
                value={blessing}
                onChange={(e) => setBlessing(e.target.value)}
                placeholder="在此写下对新人的祝福寄语（将同步推送至祝福墙与弹幕）..."
                className="w-full rounded-xl border border-stone-200 p-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#8B1E1E] font-serif"
              />
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium shadow-md transition-opacity hover:opacity-95 cursor-pointer text-xs font-serif"
              style={{ backgroundColor: themePrimary }}
            >
              <Send className="h-4 w-4" />
              <span>确认提交出席回执 (同步至 Notion)</span>
            </button>
          </form>
        )}
      </div>

      {/* 微信原生手机号授权模拟弹窗 */}
      {isPhoneAuthDialogShow && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center animate-fade-in p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-slide-up text-left">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#07C160] text-white flex items-center justify-center text-xs font-bold">
                  微
                </div>
                <span className="font-bold text-xs text-stone-900">
                  结婚请柬小程序 申请
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPhoneAuthDialogShow(false)}
                className="text-stone-400 hover:text-stone-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-stone-900">
                获取你的手机号
              </div>
              <div className="text-[11px] text-stone-500">
                用于向新人提交宴席出席席位回执与联系确认
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <div>
                <div className="text-xs font-bold font-mono text-stone-900">
                  138 8888 8888
                </div>
                <div className="text-[10px] text-stone-400">
                  微信绑定号码
                </div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-[#07C160]" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsPhoneAuthDialogShow(false)}
                className="py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
              >
                拒绝
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoneAuth}
                className="py-2.5 rounded-full bg-[#07C160] hover:bg-[#06AD56] text-white font-bold text-xs shadow-md cursor-pointer"
              >
                允许并填入
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
