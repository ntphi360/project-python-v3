import { useRef, useState } from "react";
import { Download, FileSpreadsheet, RotateCcw, UploadCloud } from "lucide-react";

import "./ImportPage.css";

const acceptedExtensions = [".xlsx", ".xls", ".csv"];
const initialFilters = {
  fromDate: "",
  toDate: "",
  field: "",
  procedure: "",
  department: "",
  handler: "",
  status: "",
  format: "xlsx",
};

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
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
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}

function ImportPage() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [exportFilters, setExportFilters] = useState(initialFilters);

  function handleFileChange(event) {
    const [file] = event.target.files;
    event.target.value = "";

    if (!file) return;

    if (!acceptedExtensions.includes(getExtension(file.name))) {
      setSelectedFile(null);
      setFileError("Chỉ hỗ trợ file .xlsx, .xls hoặc .csv.");
      return;
    }

    setSelectedFile(file);
    setFileError("");
  }

  function resetImport() {
    setSelectedFile(null);
    setFileError("");
  }

  function updateExportFilter(name, value) {
    setExportFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="data-transfer-page">
      <div className="data-transfer-page__heading">
        <h1>Import / Export dữ liệu</h1>
        <p>Chuẩn bị file dữ liệu và thiết lập điều kiện xuất báo cáo.</p>
      </div>

      <article className="transfer-card">
        <header className="transfer-card__header">
          <div>
            <span className="transfer-card__icon"><UploadCloud size={19} /></span>
            <div>
              <h2>Import dữ liệu</h2>
              <p>Hỗ trợ file Excel và CSV.</p>
            </div>
          </div>
          {selectedFile && (
            <button className="transfer-button transfer-button--secondary" type="button" onClick={resetImport}>
              <RotateCcw size={14} /> Chọn lại
            </button>
          )}
        </header>

        <div className="transfer-card__body">
          <button className="file-dropzone" type="button" onClick={() => fileInputRef.current?.click()}>
            <FileSpreadsheet size={29} />
            <strong>Chọn file dữ liệu</strong>
            <span>.xlsx, .xls hoặc .csv</span>
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
              <FileSpreadsheet size={18} />
              <div>
                <strong title={selectedFile.name}>{selectedFile.name}</strong>
                <span>
                  {formatFileSize(selectedFile.size)} · {getExtension(selectedFile.name).slice(1).toUpperCase()} · Sửa lần cuối {formatModifiedDate(selectedFile.lastModified)}
                </span>
              </div>
              <span className="transfer-state transfer-state--selected">Đã chọn</span>
            </div>
          )}
          {fileError && <p className="transfer-message transfer-message--error" role="alert">{fileError}</p>}
        </div>

        <div className="preview-section">
          <div className="preview-section__heading">
            <div>
              <h3>Xem trước dữ liệu</h3>
              <p>Nội dung file sẽ hiển thị tại đây khi kết nối API được triển khai.</p>
            </div>
            <button className="transfer-button transfer-button--primary" disabled type="button" title="Chưa kết nối API import">
              <UploadCloud size={14} /> Import dữ liệu
            </button>
          </div>
          <div className="preview-empty-state">
            <FileSpreadsheet size={28} />
            <strong>Chưa có dữ liệu xem trước</strong>
            <span>{selectedFile ? "File đã được chọn nhưng chưa được gửi hoặc đọc." : "Chọn file để chuẩn bị import dữ liệu."}</span>
          </div>
        </div>
      </article>

      <article className="transfer-card transfer-card--export">
        <header className="transfer-card__header">
          <div>
            <span className="transfer-card__icon transfer-card__icon--green"><Download size={19} /></span>
            <div>
              <h2>Export dữ liệu</h2>
              <p>Thiết lập bộ lọc và định dạng file cần xuất.</p>
            </div>
          </div>
        </header>

        <form className="export-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>Từ ngày</span>
            <input type="date" value={exportFilters.fromDate} onChange={(event) => updateExportFilter("fromDate", event.target.value)} />
          </label>
          <label>
            <span>Đến ngày</span>
            <input min={exportFilters.fromDate || undefined} type="date" value={exportFilters.toDate} onChange={(event) => updateExportFilter("toDate", event.target.value)} />
          </label>
          <label>
            <span>Lĩnh vực</span>
            <select disabled value={exportFilters.field} onChange={(event) => updateExportFilter("field", event.target.value)}><option value="">Chưa có dữ liệu</option></select>
          </label>
          <label>
            <span>Thủ tục hành chính</span>
            <select disabled value={exportFilters.procedure} onChange={(event) => updateExportFilter("procedure", event.target.value)}><option value="">Chưa có dữ liệu</option></select>
          </label>
          <label>
            <span>Phòng ban</span>
            <select disabled value={exportFilters.department} onChange={(event) => updateExportFilter("department", event.target.value)}><option value="">Chưa có dữ liệu</option></select>
          </label>
          <label>
            <span>Người xử lý</span>
            <select disabled value={exportFilters.handler} onChange={(event) => updateExportFilter("handler", event.target.value)}><option value="">Chưa có dữ liệu</option></select>
          </label>
          <label>
            <span>Trạng thái</span>
            <select value={exportFilters.status} onChange={(event) => updateExportFilter("status", event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="Mới tiếp nhận">Mới tiếp nhận</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Sắp hạn">Sắp hạn</option>
              <option value="Quá hạn">Quá hạn</option>
              <option value="Hoàn thành">Hoàn thành</option>
            </select>
          </label>
          <fieldset className="export-format">
            <legend>Định dạng file</legend>
            <label><input checked={exportFilters.format === "xlsx"} name="export-format" type="radio" value="xlsx" onChange={(event) => updateExportFilter("format", event.target.value)} /> Excel (.xlsx)</label>
            <label><input checked={exportFilters.format === "csv"} name="export-format" type="radio" value="csv" onChange={(event) => updateExportFilter("format", event.target.value)} /> CSV (.csv)</label>
          </fieldset>
          <div className="export-form__actions">
            <button className="transfer-button transfer-button--secondary" type="button" onClick={() => setExportFilters(initialFilters)}><RotateCcw size={14} /> Đặt lại</button>
            <button className="transfer-button transfer-button--primary transfer-button--green" disabled type="submit" title="Chưa kết nối API export"><Download size={14} /> Xuất dữ liệu</button>
          </div>
        </form>
        <p className="transfer-message transfer-message--warning">Import và Export đang ở trạng thái chưa kết nối API.</p>
      </article>
    </section>
  );
}

export default ImportPage;
