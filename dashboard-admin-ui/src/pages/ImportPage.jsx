import {useRef, useState} from "react";
import {
    FileSpreadsheet,
    RotateCcw,
    UploadCloud,
} from "lucide-react";

import api from "../services/api";

import "./ImportPage.css";

const acceptedExtensions = [".xlsx", ".xls", ".csv"];

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return "—";

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModifiedDate(timestamp) {
    if (!timestamp) return "—";

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(timestamp));
}

function getExtension(filename) {
    const dotIndex = filename.lastIndexOf(".");

    return dotIndex >= 0
        ? filename.slice(dotIndex).toLowerCase()
        : "";
}

function ImportPage() {
    const fileInputRef = useRef(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [importMessage, setImportMessage] = useState("");
    const [isImporting, setIsImporting] = useState(false);

    function handleFileChange(event) {
        const [file] = event.target.files;

        event.target.value = "";

        if (!file) {
            return;
        }

        const extension = getExtension(file.name);

        if (!acceptedExtensions.includes(extension)) {
            setSelectedFile(null);

            setFileError(
                "Chỉ hỗ trợ file .xlsx, .xls hoặc .csv."
            );

            setImportMessage("");

            return;
        }

        setSelectedFile(file);
        setFileError("");
        setImportMessage("");
    }

    function resetImport() {
        setSelectedFile(null);
        setFileError("");
        setImportMessage("");
    }

    async function handleImport() {
        if (!selectedFile) {
            setFileError(
                "Vui lòng chọn file trước khi import."
            );

            return;
        }

        try {
            setIsImporting(true);
            setFileError("");
            setImportMessage("");

            const formData = new FormData();

            formData.append(
                "file",
                selectedFile
            );

            const response = await api.post(
                "/import/cases",
                formData
            );

            setImportMessage(
                response.data?.message ||
                "Import dữ liệu thành công."
            );

            setSelectedFile(null);
        } catch (error) {
            console.error(
                "Import dữ liệu thất bại:",
                error
            );

            const message =
                error.response?.data?.message ||
                error.response?.data?.errors ||
                "Import dữ liệu thất bại.";

            setFileError(message);
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <section className="data-transfer-page">
            <div className="data-transfer-page__heading">
                <h1>Import dữ liệu</h1>

                <p>
                    Chọn file dữ liệu hồ sơ để import
                    vào hệ thống.
                </p>
            </div>

            <article className="transfer-card">
                <header className="transfer-card__header">
                    <div>
            <span className="transfer-card__icon">
              <UploadCloud size={19}/>
            </span>

                        <div>
                            <h2>Import dữ liệu</h2>

                            <p>
                                Hỗ trợ file Excel và CSV.
                            </p>
                        </div>
                    </div>

                    {selectedFile && (
                        <button
                            className="
                transfer-button
                transfer-button--secondary
              "
                            type="button"
                            onClick={resetImport}
                            disabled={isImporting}
                        >
                            <RotateCcw size={14}/>

                            Chọn lại
                        </button>
                    )}
                </header>

                <div className="transfer-card__body">
                    <button
                        className="file-dropzone"
                        type="button"
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        disabled={isImporting}
                    >
                        <FileSpreadsheet size={29}/>

                        <strong>
                            Chọn file dữ liệu
                        </strong>

                        <span>
              .xlsx, .xls hoặc .csv
            </span>
                    </button>

                    <input
                        ref={fileInputRef}
                        accept=".xlsx,.xls,.csv"
                        className="transfer-file-input"
                        type="file"
                        onChange={handleFileChange}
                    />

                    {selectedFile && (
                        <div className="selected-file-info">
                            <FileSpreadsheet size={18}/>

                            <div>
                                <strong
                                    title={selectedFile.name}
                                >
                                    {selectedFile.name}
                                </strong>

                                <span>
                  {formatFileSize(
                      selectedFile.size
                  )}
                                    {" · "}

                                    {getExtension(
                                        selectedFile.name
                                    )
                                        .slice(1)
                                        .toUpperCase()}

                                    {" · "}

                                    Sửa lần cuối{" "}

                                    {formatModifiedDate(
                                        selectedFile.lastModified
                                    )}
                </span>
                            </div>

                            <span
                                className="
                  transfer-state
                  transfer-state--selected
                "
                            >
                Đã chọn
              </span>
                        </div>
                    )}

                    {fileError && (
                        <p
                            className="
                transfer-message
                transfer-message--error
              "
                            role="alert"
                        >
                            {fileError}
                        </p>
                    )}

                    {importMessage && (
                        <p
                            className="
                transfer-message
                transfer-message--success
              "
                        >
                            {importMessage}
                        </p>
                    )}
                </div>

                <div className="preview-section">
                    <div className="preview-section__heading">
                        <div>
                            <h3>
                                Import dữ liệu hồ sơ
                            </h3>

                            <p>
                                Chọn file và nhấn Import dữ liệu
                                để đưa dữ liệu vào hệ thống.
                            </p>
                        </div>

                        <button
                            className="
                transfer-button
                transfer-button--primary
              "
                            type="button"
                            onClick={handleImport}
                            disabled={
                                !selectedFile ||
                                isImporting
                            }
                        >
                            <UploadCloud size={14}/>

                            {isImporting
                                ? "Đang import..."
                                : "Import dữ liệu"}
                        </button>
                    </div>

                    <div className="preview-empty-state">
                        <FileSpreadsheet size={28}/>

                        {selectedFile ? (
                            <>
                                <strong>
                                    File đã sẵn sàng
                                </strong>

                                <span>
                  Nhấn Import dữ liệu để
                  gửi file lên hệ thống.
                </span>
                            </>
                        ) : (
                            <>
                                <strong>
                                    Chưa chọn file
                                </strong>

                                <span>
                  Chọn file Excel hoặc CSV
                  để bắt đầu import dữ liệu.
                </span>
                            </>
                        )}
                    </div>
                </div>
            </article>
        </section>
    );
}

export default ImportPage;