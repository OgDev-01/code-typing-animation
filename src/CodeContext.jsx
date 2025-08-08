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
import * as htmlToImage from "html-to-image";
import GIF from "gif.js";
import gifWorker from "gif.js/dist/gif.worker.js?url";
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

  // Syntax highlighting with Prism
  useEffect(() => {
    Prism.highlightAllUnder(document.body);
  }, [code, language]);

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

  const exportGif = async ({ fps = 12, scale = 1 } = {}) => {
    if (isExporting) return;
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);
      cancelExportRef.current = false;

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

      const totalFrames = input.length + 1;
      for (let i = 0; i <= input.length; i += 1) {
        if (cancelExportRef.current) break;
        setCode(input.slice(0, i));
        await waitForNextFrame(0);
        const canvas = await htmlToImage.toCanvas(container, {
          backgroundColor: "#0f1220",
          width,
          height,
          style: {
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          },
        });
        gif.addFrame(canvas, { delay: frameDelay });
        setExportProgress(i / totalFrames);
        await waitForNextFrame(frameDelay);
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

  const exportVideo = async ({ fps = 24, scale = 1, format = "webm" } = {}) => {
    if (isExporting) return;
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);
      cancelExportRef.current = false;

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

      const totalFrames = input.length + 1;
      for (let i = 0; i <= input.length; i += 1) {
        if (cancelExportRef.current) break;
        setCode(input.slice(0, i));
        await waitForNextFrame(0);
        const frameCanvas = await htmlToImage.toCanvas(container, {
          backgroundColor: "#0f1220",
          width,
          height,
          style: {
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          },
        });
        ctx.drawImage(frameCanvas, 0, 0, width, height);
        setExportProgress(i / totalFrames);
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
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      downloadBlob(blob, `codeanimate.${ext}`);
    } catch (err) {
      setExportError(err?.message || "Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(1);
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
      }}
    >
      {children}
    </CodeContext.Provider>
  );
};

CodeProvider.propTypes = {
  children: PropTypes.node,
};
