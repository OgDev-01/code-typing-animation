import PropTypes from "prop-types";
import { createContext, useState, useRef, useEffect } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
// import * as htmlToImage from "html-to-image";
import GIF from "gif.js";
import gifWorker from "gif.js/dist/gif.worker.js?url";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import "prism-themes/themes/prism-vsc-dark-plus.css"; // VSCode Dark+ theme
import "prismjs/plugins/line-numbers/prism-line-numbers.js"; // Line numbers plugin
import "prismjs/plugins/line-numbers/prism-line-numbers.css"; // Line numbers CSS

export const CodeContext = createContext();

export const CodeProvider = ({ children }) => {
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [inputVisible, setInputVisible] = useState(true);
  const [language, setLanguage] = useState("javascript");
  const [animationSpeed, setAnimationSpeed] = useState(100); // Represents a percentage
  const index = useRef(0);
  const animationTimeout = useRef(null);
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const codeElRef = useRef(null);
  const [suspendHighlight, setSuspendHighlight] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState(null);
  const cancelExportRef = useRef(false);

  // Cursor blinking effect
  const [cursor, setCursor] = useState("|");
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursor((prevState) => (prevState === "\u00a0" ? "|" : "\u00a0"));
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Syntax highlighting with Prism (targeted + throttled)
  useEffect(() => {
    let rafId = null;
    const el = codeElRef.current;
    if (!el || suspendHighlight) return;
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        try {
          Prism.highlightElement(el);
        } catch (_) {
          /* ignore */
        }
      });
    };
    schedule();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [code, language, suspendHighlight]);

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSpeedChange = (event) => {
    setAnimationSpeed(Number(event.target.value));
  };

  const animateCode = () => {
    setCode("");
    index.current = 0;
    clearTimeout(animationTimeout.current);
    typeCode();
  };

  const typeCode = () => {
    if (index.current < input.length) {
      const nextChar = input.charAt(index.current);
      setCode((prevCode) => prevCode + nextChar);
      index.current++;
      const delay = Math.max(10, 200 - 2 * animationSpeed); // Setting a minimum delay of 25ms and a maximum of 200ms
      animationTimeout.current = setTimeout(typeCode, delay);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const { selectionStart, selectionEnd } = textareaRef.current;
      const newText =
        input.substring(0, selectionStart) +
        "    " +
        input.substring(selectionEnd);
      setInput(newText);
      textareaRef.current.selectionStart = selectionStart + 4;
      textareaRef.current.selectionEnd = selectionStart + 4;
    }
  };

  const toggleInputVisibility = () => {
    setInputVisible(!inputVisible);
  };

  const cancelExport = () => {
    cancelExportRef.current = true;
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const waitForNextFrame = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const getLanguageGrammar = (lang) => {
    return Prism.languages[lang] || Prism.languages.javascript;
  };

  const getTokenColor = (type) => {
    switch (type) {
      case "comment":
      case "prolog":
      case "doctype":
      case "cdata":
        return "#5c6370";
      case "punctuation":
        return "#abb2bf";
      case "property":
      case "tag":
      case "constant":
      case "symbol":
      case "deleted":
        return "#e06c75";
      case "boolean":
      case "number":
        return "#d19a66";
      case "selector":
      case "attr-name":
      case "string":
      case "char":
      case "builtin":
      case "inserted":
        return "#98c379";
      case "operator":
      case "entity":
      case "url":
        return "#56b6c2";
      case "atrule":
      case "keyword":
      case "class-name":
        return "#c678dd";
      case "function":
      case "regex":
      case "important":
      case "variable":
        return "#61afef";
      default:
        return "#d7dce2";
    }
  };

  const drawHighlightedTextToCanvas = (ctx, text, lang, options) => {
    const {
      width,
      height,
      padding = 24,
      lineHeight = 22,
      font = "14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      bg = "#0f1220",
    } = options || {};
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.font = font;
    ctx.textBaseline = "top";
    const grammar = getLanguageGrammar(lang);
    const tokens = Prism.tokenize(text, grammar);

    let x = padding;
    let y = padding;
    const drawStr = (s, color) => {
      const parts = s.split("\n");
      for (let i = 0; i < parts.length; i++) {
        const segment = parts[i];
        if (segment.length > 0) {
          ctx.fillStyle = color;
          ctx.fillText(segment, x, y);
          x += ctx.measureText(segment).width;
        }
        if (i < parts.length - 1) {
          x = padding;
          y += lineHeight;
        }
      }
    };

    tokens.forEach((tok) => {
      if (typeof tok === "string") {
        drawStr(tok, getTokenColor("plain"));
      } else {
        const color = getTokenColor(tok.type);
        const content = Array.isArray(tok.content)
          ? tok.content.join("")
          : tok.content;
        drawStr(content, color);
      }
    });
    ctx.restore();
  };

  const exportGif = async ({ fps = 12, scale = 1, maxFrames = 600 } = {}) => {
    if (isExporting) return;
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);
      cancelExportRef.current = false;
      setSuspendHighlight(true);

      const container = previewRef.current;
      const rect = container.getBoundingClientRect();
      const frameDelay = Math.max(10, Math.round(1000 / fps));

      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));

      const gif = new GIF({
        workers: 2,
        quality: 10,
        repeat: 0,
        workerScript: gifWorker,
        width,
        height,
        background: "#0f1220",
      });

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const offCtx = off.getContext("2d");

      const step = Math.max(
        1,
        Math.ceil(input.length / Math.max(1, maxFrames))
      );
      const totalFrames = Math.ceil(input.length / step) + 1;
      for (let i = 0, f = 0; i <= input.length; i += step, f += 1) {
        if (cancelExportRef.current) break;
        const typed = input.slice(0, i);
        drawHighlightedTextToCanvas(offCtx, typed, language, { width, height });
        gif.addFrame(off, { delay: frameDelay, copy: true });
        setExportProgress(f / totalFrames);
        await waitForNextFrame(frameDelay);
      }

      // Ensure last full frame
      if (!cancelExportRef.current && input.length % step !== 0) {
        drawHighlightedTextToCanvas(offCtx, input, language, { width, height });
        gif.addFrame(off, { delay: frameDelay, copy: true });
      }

      if (cancelExportRef.current) {
        setIsExporting(false);
        setExportProgress(0);
        return;
      }

      await new Promise((resolve) => {
        gif.on("finished", (blob) => {
          downloadBlob(blob, "codeanimate.gif");
          resolve();
        });
        gif.render();
      });
    } catch (err) {
      setExportError(err?.message || "Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(1);
      setSuspendHighlight(false);
    }
  };

  const pickMimeType = (preferred = "webm") => {
    const candidates =
      preferred === "mp4"
        ? [
            "video/mp4;codecs=h264,aac",
            "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
            "video/mp4",
          ]
        : [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
          ];
    for (const type of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported(type)
      ) {
        return type;
      }
    }
    return preferred === "mp4" ? "video/webm" : "video/webm";
  };

  const exportVideo = async ({
    fps = 24,
    scale = 1,
    format = "webm",
    maxFrames = 1200,
  } = {}) => {
    if (isExporting) return;
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);
      cancelExportRef.current = false;
      setSuspendHighlight(true);

      const container = previewRef.current;
      const rect = container.getBoundingClientRect();
      const frameDelay = Math.max(10, Math.round(1000 / fps));

      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0f1220";
      ctx.fillRect(0, 0, width, height);

      const stream = canvas.captureStream(fps);
      const mimeType = pickMimeType(format);
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const stopRecorder = () =>
        new Promise((resolve) => {
          recorder.onstop = () => resolve();
          try {
            recorder.stop();
          } catch (_) {
            resolve();
          }
        });

      recorder.start();

      const preEl = container.querySelector("pre");
      const hadLineNumbers = preEl?.classList.contains("line-numbers");
      if (hadLineNumbers) preEl.classList.remove("line-numbers");

      const step = Math.max(
        1,
        Math.ceil(input.length / Math.max(1, maxFrames))
      );
      const totalFrames = Math.ceil(input.length / step) + 1;
      for (let i = 0, f = 0; i <= input.length; i += step, f += 1) {
        if (cancelExportRef.current) break;
        setCode(input.slice(0, i));
        await waitForNextFrame(0);
        const typed = input.slice(0, i);
        drawHighlightedTextToCanvas(ctx, typed, language, { width, height });
        setExportProgress(f / totalFrames);
        await waitForNextFrame(frameDelay);
      }

      if (cancelExportRef.current) {
        await stopRecorder();
        setIsExporting(false);
        setExportProgress(0);
        return;
      }

      // Pad the last frame a bit so players show it clearly
      await waitForNextFrame(300);
      await stopRecorder();

      const blob = new Blob(chunks, { type: mimeType });
      let finalBlob = blob;
      let finalExt = mimeType.includes("mp4") ? "mp4" : "webm";

      if (format === "mp4" && finalExt !== "mp4") {
        const ffmpeg = new FFmpeg();
        await ffmpeg.load();
        await ffmpeg.writeFile("input.webm", await fetchFile(blob));
        await ffmpeg.exec([
          "-i",
          "input.webm",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "output.mp4",
        ]);
        const data = await ffmpeg.readFile("output.mp4");
        finalBlob = new Blob([data.buffer], { type: "video/mp4" });
        finalExt = "mp4";
      } else if (format === "mov" && finalExt !== "mov") {
        const ffmpeg = new FFmpeg();
        await ffmpeg.load();
        const inputName = finalExt === "mp4" ? "input.mp4" : "input.webm";
        await ffmpeg.writeFile(inputName, await fetchFile(blob));
        await ffmpeg.exec([
          "-i",
          inputName,
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "output.mov",
        ]);
        const data = await ffmpeg.readFile("output.mov");
        finalBlob = new Blob([data.buffer], { type: "video/quicktime" });
        finalExt = "mov";
      }

      downloadBlob(finalBlob, `codeanimate.${finalExt}`);
    } catch (err) {
      setExportError(err?.message || "Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(1);
      setSuspendHighlight(false);
    }
  };

  return (
    <CodeContext.Provider
      value={{
        input,
        setInput,
        code,
        setCode,
        inputVisible,
        toggleInputVisibility,
        animationSpeed,
        setAnimationSpeed,
        cursor, // Expose cursor for display in the UI
        handleInputChange,
        handleSpeedChange,
        animateCode,
        handleKeyDown,
        textareaRef, // Provide the ref so the Input component can use it
        previewRef,
        isExporting,
        exportProgress,
        exportError,
        exportGif,
        cancelExport,
        language,
        setLanguage,
        exportVideo,
        codeElRef,
      }}
    >
      {children}
    </CodeContext.Provider>
  );
};

CodeProvider.propTypes = {
  children: PropTypes.node,
};
