import { useRef } from "react";
import { Camera, Upload, Search, FileText, Volume2 } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

const C = {
  teal:        "#45C5BC",
  tealDark:    "#38B2A9",
  tealLight:   "#F0FDFA",
  bg:          "#F8FAFC",
  muted:       "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond:  "#64748B",
  textDisabled:"#94A3B8",
  border:      "#E2E8F0",
};

export function ScanScreen() {
  const { t } = useTranslation();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const features = [
    { icon: <Search size={20} color={C.teal} />,   title: t('medications.featureIdentifyTitle'),   desc: t('medications.featureIdentifyDesc')   },
    { icon: <FileText size={20} color={C.teal} />, title: t('medications.featureTranslateTitle'),  desc: t('medications.featureTranslateDesc')  },
    { icon: <Volume2 size={20} color={C.teal} />,  title: t('medications.featureTtsTitle'),         desc: t('medications.featureTtsDesc')         },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-y-auto h-full pb-6 max-w-2xl mx-auto w-full">

      <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: C.textPrimary }}>
        {t('medications.scanTitle')}
      </h1>

      {/* Hero scan card */}
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center" style={{ border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.tealLight }}>
          <Camera size={36} color={C.teal} />
        </div>
        <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary, marginBottom: "8px" }}>
          {t('medications.scanTitle')}
        </h2>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond, marginBottom: "24px" }}>
          {t('medications.tapToScan')}
        </p>

        <div className="flex gap-3 w-full">
          {/* Open Camera */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: C.muted, border: `1.5px solid ${C.border}`, color: C.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600 }}
          >
            <Camera size={18} color={C.textSecond} />
            {t('medications.openCamera')}
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Upload Photo */}
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: C.muted, border: `1.5px solid ${C.border}`, color: C.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600 }}
          >
            <Upload size={18} color={C.textSecond} />
            {t('medications.uploadPhoto')}
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      {/* Features */}
      <div>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "12px", fontWeight: 700, color: C.textDisabled, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>
          {t('medications.whatYouCanDo')}
        </p>
        <div className="space-y-3">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl bg-white" style={{ border: `1px solid ${C.border}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.tealLight }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, color: C.textPrimary }}>
                  {f.title}
                </p>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginTop: "2px" }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-3">
        <div className="p-4 rounded-xl" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Camera size={15} color={C.textSecond} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: C.textPrimary }}>
              {t('medications.tipsCameraTitle')}
            </p>
          </div>
          {[
            t('medications.tipCamera1'),
            t('medications.tipCamera2'),
            t('medications.tipCamera3'),
            t('medications.tipCamera4'),
          ].map((tip) => (
            <p key={tip} style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginBottom: "4px" }}>
              · {tip}
            </p>
          ))}
        </div>

        <div className="p-4 rounded-xl" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Upload size={15} color={C.textSecond} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: C.textPrimary }}>
              {t('medications.tipsUploadTitle')}
            </p>
          </div>
          {[
            t('medications.tipUpload1'),
            t('medications.tipUpload2'),
            t('medications.tipUpload3'),
            t('medications.tipUpload4'),
          ].map((tip) => (
            <p key={tip} style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginBottom: "4px" }}>
              · {tip}
            </p>
          ))}
        </div>
      </div>

    </div>
  );
}
