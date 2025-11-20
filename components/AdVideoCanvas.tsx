"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Panel = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
};

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const FPS = 30;
const DURATION = 20000; // ms

const SCENE_TIMINGS = [
  { start: 0, end: 5000 },
  { start: 5000, end: 10000 },
  { start: 10000, end: 15000 },
  { start: 15000, end: 20000 }
] as const;

const easing = (t: number) => 1 - Math.pow(1 - t, 3);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const formatTime = (ms: number) =>
  new Date(ms).toISOString().substring(14, 19);

export function AdVideoCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const recorderRef = useRef<MediaRecorder>();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const panelSetRef = useRef<Panel[]>([]);
  const chunksRef = useRef<BlobPart[]>([]);

  const resetState = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl(null);
    setCurrentTime(0);
    setError(null);
    chunksRef.current = [];
  }, [downloadUrl]);

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, elapsed: number) => {
    ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO_HEIGHT);
    gradient.addColorStop(0, "#001029");
    gradient.addColorStop(0.5, "#031b3d");
    gradient.addColorStop(1, "#020916");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    const waveHeight = 40;
    const waveLength = 200;
    const waveOffset = (elapsed / 2000) * Math.PI * 2;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#1b64f2";
    ctx.beginPath();
    ctx.moveTo(0, VIDEO_HEIGHT);
    for (let x = 0; x <= VIDEO_WIDTH; x += 10) {
      const angle = (x / waveLength) * Math.PI + waveOffset;
      const y = VIDEO_HEIGHT - waveHeight - Math.sin(angle) * 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIDEO_WIDTH, VIDEO_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const panels = panelSetRef.current;
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (const panel of panels) {
      const offsetY = Math.sin((elapsed / 1000) * panel.speed + panel.x / 80) * 5;
      ctx.fillStyle = "rgba(18, 114, 238, 0.8)";
      ctx.fillRect(panel.x, panel.y + offsetY, panel.width, panel.height);
      ctx.fillStyle = "rgba(50, 156, 255, 0.45)";
      ctx.fillRect(panel.x + 5, panel.y + offsetY + 5, panel.width - 10, panel.height - 10);
    }
    ctx.restore();

    const sceneIndex = SCENE_TIMINGS.findIndex(
      ({ start, end }) => elapsed >= start && elapsed < end
    );
    const sceneProgress = SCENE_TIMINGS[sceneIndex] || SCENE_TIMINGS[SCENE_TIMINGS.length - 1];
    const localProgress = clamp((elapsed - sceneProgress.start) / (sceneProgress.end - sceneProgress.start), 0, 1);
    const eased = easing(localProgress);

    const fadeIn = clamp(eased * 1.1, 0, 1);
    const fadeOut = clamp(1 - (eased - 0.4) * 1.2, 0, 1);
    const visibility = fadeIn * fadeOut;

    ctx.globalAlpha = visibility;
    ctx.fillStyle = "#f8fafc";
    ctx.textBaseline = "middle";

    const primaryFont = "bold 70px 'Inter', 'Segoe UI', sans-serif";
    const secondaryFont = "500 40px 'Inter', 'Segoe UI', sans-serif";
    const tertiaryFont = "400 30px 'Inter', 'Segoe UI', sans-serif";

    const drawCenteredText = (text: string, y: number, font: string) => {
      ctx.font = font;
      const metrics = ctx.measureText(text);
      ctx.fillText(text, (VIDEO_WIDTH - metrics.width) / 2, y);
    };

    const drawHighlight = (text: string, y: number, font: string) => {
      ctx.font = font;
      const metrics = ctx.measureText(text);
      const paddingX = 24;
      const paddingY = 16;
      const x = (VIDEO_WIDTH - metrics.width) / 2 - paddingX;
      const width = metrics.width + paddingX * 2;
      const height = parseInt(font, 10) + paddingY;
      ctx.save();
      ctx.fillStyle = "rgba(15,76,217,0.85)";
      ctx.beginPath();
      const ctxWithRound = ctx as typeof ctx & {
        roundRect?: (
          x: number,
          y: number,
          width: number,
          height: number,
          radii: number | DOMPointInit | (number | DOMPointInit)[]
        ) => void;
      };
      if (typeof ctxWithRound.roundRect === "function") {
        ctxWithRound.roundRect(x, y - height / 2, width, height, 18);
        ctx.fill();
      } else {
        ctx.fillRect(x, y - height / 2, width, height);
      }
      ctx.restore();
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(text, (VIDEO_WIDTH - metrics.width) / 2, y);
    };

    switch (sceneIndex) {
      case 0: {
        drawCenteredText("Antech O&M", VIDEO_HEIGHT / 2 - 60, primaryFont);
        ctx.fillStyle = "#38bdf8";
        drawCenteredText("Energia solar com performance máxima", VIDEO_HEIGHT / 2 + 20, secondaryFont);
        break;
      }
      case 1: {
        ctx.fillStyle = "#f8fafc";
        drawCenteredText("Lavagem profissional de módulos", VIDEO_HEIGHT / 2 - 40, secondaryFont);
        ctx.fillStyle = "#38bdf8";
        drawCenteredText("Roçagem inteligente do campo solar", VIDEO_HEIGHT / 2 + 40, secondaryFont);
        break;
      }
      case 2: {
        ctx.fillStyle = "#f8fafc";
        drawCenteredText("Resultados comprovados", VIDEO_HEIGHT / 2 - 140, secondaryFont);
        ctx.font = tertiaryFont;
        ctx.fillStyle = "#e2e8f0";
        const bullets = [
          "+ 18% de ganho médio de eficiência",
          "Equipe especializada em O&M",
          "Protocolos ecológicos e seguros"
        ];
        bullets.forEach((item, index) => {
          ctx.fillText(`• ${item}`, VIDEO_WIDTH * 0.23, VIDEO_HEIGHT / 2 - 40 + index * 60);
        });
        break;
      }
      default: {
        ctx.fillStyle = "#f8fafc";
        drawCenteredText("Otimize sua usina com quem entende do assunto", VIDEO_HEIGHT / 2 - 20, secondaryFont);
        ctx.fillStyle = "#f8fafc";
        drawHighlight("Agende uma visita técnica", VIDEO_HEIGHT / 2 + 80, secondaryFont);
        ctx.fillStyle = "#60a5fa";
        drawCenteredText("contato@antech-om.com • (11) 4000-2040", VIDEO_HEIGHT - 80, tertiaryFont);
        break;
      }
    }

    ctx.globalAlpha = 1;
    ctx.font = "500 26px 'Inter', 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
    ctx.fillText(
      "Lavagem e roçagem de usinas solares em padrão premium.",
      48,
      VIDEO_HEIGHT - 40
    );
  }, []);

  const renderAnimation = useCallback(
    (start: number, ctx: CanvasRenderingContext2D) => {
      const tick = (now: number) => {
        const elapsed = now - start;
        setCurrentTime(elapsed);
        drawScene(ctx, elapsed);
        if (elapsed < DURATION) {
          animationFrameRef.current = requestAnimationFrame(tick);
        } else {
          setCurrentTime(DURATION);
          animationFrameRef.current = undefined;
          if (recorderRef.current && recorderRef.current.state !== "inactive") {
            setIsProcessing(true);
            recorderRef.current.stop();
          }
        }
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [drawScene]
  );

  const handleGenerate = useCallback(() => {
    if (!canvasRef.current) {
      setError("Canvas não disponível.");
      return;
    }
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      setError("O navegador não suporta gravação de mídia.");
      return;
    }

    resetState();
    setIsRecording(true);
    setIsProcessing(false);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Não foi possível inicializar o contexto do vídeo.");
      setIsRecording(false);
      setIsProcessing(false);
      return;
    }

    panelSetRef.current = Array.from({ length: 20 }, () => ({
      x: Math.random() * (VIDEO_WIDTH - 200),
      y: Math.random() * (VIDEO_HEIGHT - 280) + 120,
      width: 160 + Math.random() * 80,
      height: 40 + Math.random() * 25,
      speed: 0.6 + Math.random() * 0.8
    }));

    const stream = canvas.captureStream(FPS);
    const mimeOptions = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    const mimeType = mimeOptions.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        setIsProcessing(false);
        const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      };

      recorder.start();
      const start = performance.now();
      renderAnimation(start, ctx);
      setTimeout(() => {
        if (recorder.state !== "inactive") {
          setIsProcessing(true);
          recorder.stop();
        }
      }, DURATION + 500);
    } catch (err) {
      console.error(err);
      setError("Erro ao iniciar gravação. Tente novamente.");
      setIsRecording(false);
      setIsProcessing(false);
    }
  }, [renderAnimation, resetState]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const currentSceneIndex = SCENE_TIMINGS.findIndex(
    ({ start, end }) => currentTime >= start && currentTime < end
  );

  return (
    <div className="video-card">
      <div className="video-header">
        <div>
          <h1>Antech O&amp;M</h1>
          <p>Gere um vídeo de propaganda enfatizando lavagem e roçagem de usinas solares.</p>
        </div>
        <div className="status">
          <span>
            {isProcessing ? "Processando..." : isRecording ? "Gravando" : "Pronto"}
          </span>
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          aria-label="Pré-visualização do vídeo publicitário da Antech O&M"
        />
      </div>
      <div className="controls">
        <button
          className="action"
          type="button"
          onClick={handleGenerate}
          disabled={isRecording}
        >
          {isRecording ? "Gerando..." : "Gerar vídeo"}
        </button>
        {downloadUrl && (
          <a className="download" href={downloadUrl} download="antech-om-video.webm">
            Baixar vídeo
          </a>
        )}
      </div>
      <div className="info">
        <div>
          <h2>Mensagem central</h2>
          <ol>
            <li>Força da marca Antech O&amp;M</li>
            <li>Serviços de lavagem e roçagem</li>
            <li>Resultados e diferenciais</li>
            <li>Chamada para ação</li>
          </ol>
        </div>
        <div>
          <h2>Legenda atual</h2>
          <p>
            {currentSceneIndex === 0 && "Sua usina solar merece cuidado premium."}
            {currentSceneIndex === 1 && "Lavagem minuciosa e roçagem inteligente para máxima eficiência."}
            {currentSceneIndex === 2 && "Tecnologia, equipe especializada e protocolos sustentáveis."}
            {currentSceneIndex >= 3 && "Agende uma visita e potencialize a performance do seu parque solar."}
          </p>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
      <style jsx>{`
        .video-card {
          background: rgba(7, 12, 24, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.15);
          border-radius: 24px;
          padding: 32px;
          backdrop-filter: blur(12px);
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.55);
        }

        .video-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .video-header h1 {
          font-size: 34px;
        }

        .video-header p {
          margin-top: 8px;
          color: rgba(226, 232, 240, 0.75);
        }

        .status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 14px;
          color: rgba(148, 163, 184, 0.9);
        }

        .canvas-wrapper {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(56, 189, 248, 0.2);
          position: relative;
        }

        canvas {
          width: 100%;
          height: auto;
          display: block;
          background: #000;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 24px 0 8px;
        }

        .action {
          background: linear-gradient(120deg, #2563eb, #1d4ed8);
          border: none;
          border-radius: 999px;
          padding: 14px 28px;
          color: #f8fafc;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .action:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .action:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(37, 99, 235, 0.35);
        }

        .download {
          color: #38bdf8;
          font-weight: 600;
        }

        .info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-top: 24px;
          color: rgba(226, 232, 240, 0.85);
        }

        h2 {
          font-size: 20px;
          margin-bottom: 12px;
        }

        ol {
          padding-left: 20px;
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .error {
          color: #f87171;
          margin: 0;
        }

        @media (max-width: 768px) {
          .video-card {
            padding: 24px;
          }

          .video-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .video-header h1 {
            font-size: 28px;
          }

          .info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
