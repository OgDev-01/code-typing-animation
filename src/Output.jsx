import { useContext } from "react";
import { CodeContext } from "./CodeContext";
import cx from "classnames"; // Importing cx from classnames package

const Output = () => {
  const { code, inputVisible, previewRef, language, codeElRef } =
    useContext(CodeContext);

  return (
    <div
      ref={previewRef}
      className={cx(
        "w-full overflow-auto p-10",
        inputVisible ? "h-1/2" : "h-full",
        "bg-gradient-to-b from-[#eef2f7] to-[#d9e1ea]"
      )}
    >
      <div
        className={cx(
          "code-window max-w-3xl mx-auto rounded-2xl border border-[#22283b] bg-[#161b2e]"
        )}
        style={{
          boxShadow:
            "0 12px 30px rgba(0,0,0,0.35), 0 30px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          className={cx(
            "flex items-center h-10 px-4 rounded-t-2xl border-b border-[#22283b] bg-[#0e1324]"
          )}
        >
          <div className={cx("flex items-center gap-2")}>
            <span className={cx("w-3 h-3 rounded-full bg-[#ff5f56]")}></span>
            <span className={cx("w-3 h-3 rounded-full bg-[#ffbd2e]")}></span>
            <span className={cx("w-3 h-3 rounded-full bg-[#27c93f]")}></span>
          </div>
          {/* <span className={cx("ml-3 text-xs text-gray-300")}>style.css</span> */}
        </div>
        <div className={cx("p-5 rounded-b-2xl overflow-auto")}>
          <pre
            className={cx(
              `language-${language}`,
              "line-numbers text-sm leading-6 rounded-xl px-6 py-5"
            )}
          >
            <code ref={codeElRef} className={cx(`language-${language}`)}>
              {code}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Output;
