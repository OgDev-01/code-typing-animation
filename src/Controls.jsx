import { useContext } from "react";
import { CodeContext } from "./CodeContext";
import cx from "classnames"; // Importing cx from classnames package

const Controls = () => {
  const {
    toggleInputVisibility,
    animateCode,
    inputVisible,
    animationSpeed,
    handleSpeedChange,
    exportGif,
    exportVideo,
    isExporting,
    exportProgress,
    cancelExport,
  } = useContext(CodeContext);

  return (
    <div className={cx("flex items-center h-12 bg-white p-4 mt-2 mb-2")}>
      <button
        onClick={toggleInputVisibility}
        className={cx(
          "w-8 h-8 flex justify-center items-center rounded-full bg-gray-200 hover:bg-gray-300 text-black p-0 mr-4"
        )}
      >
        {inputVisible ? <span>⏶</span> : <span>⏷</span>}
      </button>

      <div className={cx("flex justify-between flex-grow items-center")}>
        {" "}
        {/* Changed to justify-between to increase spacing */}
        {/* Animate Code Button */}
        <button
          onClick={animateCode}
          className={cx(
            "px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black mr-4"
          )}
        >
          Play &#9658;
        </button>
        {/* Animation Speed Controller */}
        <div className={cx("flex items-center")}>
          {" "}
          {/* Added flex items-center to vertically align the text with the slider */}
          <span className={cx("text-black mr-2")}>Animation Speed:</span>
          <input
            type="range"
            min="10"
            max="500"
            value={animationSpeed}
            onChange={handleSpeedChange}
            className={cx("mx-4")}
          />
        </div>
        {/* Exporters */}
        <div className={cx("flex items-center ml-4")}>
          <button
            onClick={() => exportGif({ fps: 12, scale: 1 })}
            disabled={isExporting}
            className={cx(
              "px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black mr-2",
              { "opacity-50 cursor-not-allowed": isExporting }
            )}
          >
            Export GIF
          </button>
          <button
            onClick={() => exportVideo({ fps: 24, scale: 1, format: "mp4" })}
            disabled={isExporting}
            className={cx(
              "px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black mr-2",
              { "opacity-50 cursor-not-allowed": isExporting }
            )}
          >
            Export MP4
          </button>
          <button
            onClick={() => exportVideo({ fps: 24, scale: 1, format: "mov" })}
            disabled={isExporting}
            className={cx(
              "px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black mr-2",
              { "opacity-50 cursor-not-allowed": isExporting }
            )}
          >
            Export MOV
          </button>
          {isExporting && (
            <>
              <span className={cx("text-black mr-2")}>
                {(exportProgress * 100).toFixed(0)}%
              </span>
              <button
                onClick={cancelExport}
                className={cx(
                  "px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black"
                )}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
