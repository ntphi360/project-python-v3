import { useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Files,
  Filter,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  cases,
  caseStatuses,
  departments,
  fields,
  getCaseRelations,
  procedures,
  statusKeys,
  users,
} from "../data/caseData";
import "./ReportsPage.css";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW = 3 * DAY_IN_MS;
const REPORT_NOW = new Date();
const emptyFilters = {
  fromDate: "",
  toDate: "",
  fieldId: "",
  procedureId: "",
  departmentId: "",
  assignedUserId: "",
  status: "",
};

const statusColors = {
  "Mới tiếp nhận": "#7567c9",
  "Đang xử lý": "#2775e8",
  "Sắp hạn": "#f59e0b",
  "Quá hạn": "#ef4444",
  "Hoàn thành": "#22a667",
};

const chartTooltipStyle = {
  border: "1px solid #e4eaf2",
  borderRadius: 8,
  boxShadow: "0 6px 18px rgba(32, 56, 85, 0.1)",
  fontSize: 11,
};

function getReportStatus(caseItem) {
  if (caseItem.completedDate || caseItem.status === "Hoàn thành") return "Hoàn thành";

  const appointmentTime = new Date(caseItem.appointmentReturnDate).getTime();
  const remainingTime = appointmentTime - REPORT_NOW.getTime();

  if (remainingTime < 0) return "Quá hạn";
  if (caseItem.status === "Sắp hạn" || remainingTime <= UPCOMING_WINDOW) return "Sắp hạn";
  return caseItem.status;
}

function isCompletedLate(caseItem) {
  return Boolean(caseItem.completedDate)
    && new Date(caseItem.completedDate).getTime() > new Date(caseItem.appointmentReturnDate).getTime();
}

function isOverdue(caseItem) {
  if (caseItem.completedDate) return isCompletedLate(caseItem);
  return REPORT_NOW.getTime() > new Date(caseItem.appointmentReturnDate).getTime();
}

function getLateDays(caseItem) {
  const endTime = caseItem.completedDate
    ? new Date(caseItem.completedDate).getTime()
    : REPORT_NOW.getTime();
  const appointmentTime = new Date(caseItem.appointmentReturnDate).getTime();
  return Math.max(0, Math.ceil((endTime - appointmentTime) / DAY_IN_MS));
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const [date, time = ""] = value.split("T");
  return `${formatDate(date)}${time ? ` ${time.slice(0, 5)}` : ""}`;
}

function formatPeriod(value) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function StatusBadge({ status }) {
  return <span className={`report-status report-status--${statusKeys[status]}`}>{status}</span>;
}

function ReportsPage() {
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [exportFormat, setExportFormat] = useState("xlsx");

  const availableProcedures = useMemo(
    () => procedures.filter((item) => !draftFilters.fieldId || item.fieldId === draftFilters.fieldId),
    [draftFilters.fieldId],
  );
  const availableUsers = useMemo(
    () => users.filter((item) => !draftFilters.departmentId || item.departmentId === draftFilters.departmentId),
    [draftFilters.departmentId],
  );

  const enrichedCases = useMemo(
    () => cases.map((caseItem) => ({
      ...caseItem,
      ...getCaseRelations(caseItem),
      reportStatus: getReportStatus(caseItem),
    })),
    [],
  );

  const filteredCases = useMemo(() => enrichedCases.filter((caseItem) => {
    if (appliedFilters.fromDate && caseItem.receivedDate.slice(0, 10) < appliedFilters.fromDate) return false;
    if (appliedFilters.toDate && caseItem.receivedDate.slice(0, 10) > appliedFilters.toDate) return false;
    if (appliedFilters.fieldId && caseItem.field?.id !== appliedFilters.fieldId) return false;
    if (appliedFilters.procedureId && caseItem.procedureId !== appliedFilters.procedureId) return false;
    if (appliedFilters.departmentId && caseItem.department?.id !== appliedFilters.departmentId) return false;
    if (appliedFilters.assignedUserId && caseItem.assignedUserId !== appliedFilters.assignedUserId) return false;
    if (appliedFilters.status && caseItem.reportStatus !== appliedFilters.status) return false;
    return true;
  }), [appliedFilters, enrichedCases]);

  const reportData = useMemo(() => {
    const completedCases = filteredCases.filter((item) => Boolean(item.completedDate));
    const completedOnTime = completedCases.filter((item) => !isCompletedLate(item)).length;
    const onTimeRate = completedCases.length
      ? Math.round((completedOnTime / completedCases.length) * 100)
      : 0;

    const statusData = caseStatuses.map((status) => ({
      name: status,
      value: filteredCases.filter((item) => item.reportStatus === status).length,
      fill: statusColors[status],
    }));

    const periodMap = new Map();
    filteredCases.forEach((item) => {
      const receivedPeriod = item.receivedDate.slice(0, 10);
      if (!periodMap.has(receivedPeriod)) periodMap.set(receivedPeriod, { period: receivedPeriod, received: 0, completed: 0 });
      periodMap.get(receivedPeriod).received += 1;

      if (item.completedDate) {
        const completedPeriod = item.completedDate.slice(0, 10);
        if (!periodMap.has(completedPeriod)) periodMap.set(completedPeriod, { period: completedPeriod, received: 0, completed: 0 });
        periodMap.get(completedPeriod).completed += 1;
      }
    });
    const timelineData = [...periodMap.values()].sort((first, second) => first.period.localeCompare(second.period));

    const fieldData = fields.map((field) => ({
      name: field.name,
      value: filteredCases.filter((item) => item.field?.id === field.id).length,
    })).filter((item) => item.value > 0);

    const departmentData = departments.map((department) => ({
      name: department.name,
      total: filteredCases.filter((item) => item.department?.id === department.id).length,
      overdue: filteredCases.filter((item) => item.department?.id === department.id && isOverdue(item)).length,
    })).filter((item) => item.total > 0);

    const procedureRanking = procedures.map((procedure) => {
      const procedureCases = filteredCases.filter((item) => item.procedureId === procedure.id);
      return {
        id: procedure.id,
        name: procedure.name,
        field: fields.find((item) => item.id === procedure.fieldId)?.name ?? "—",
        total: procedureCases.length,
        overdue: procedureCases.filter(isOverdue).length,
      };
    }).filter((item) => item.total > 0).sort((first, second) => second.total - first.total).slice(0, 5);

    const userPerformance = users.map((user) => {
      const userCases = filteredCases.filter((item) => item.assignedUserId === user.id);
      const userCompleted = userCases.filter((item) => Boolean(item.completedDate));
      const onTime = userCompleted.filter((item) => !isCompletedLate(item)).length;
      const late = userCompleted.filter(isCompletedLate).length;
      return {
        id: user.id,
        name: user.fullName,
        department: departments.find((item) => item.id === user.departmentId)?.name ?? "—",
        total: userCases.length,
        completed: userCompleted.length,
        onTime,
        late,
        rate: userCompleted.length ? Math.round((onTime / userCompleted.length) * 100) : 0,
      };
    }).filter((item) => item.total > 0).sort((first, second) => second.rate - first.rate || second.completed - first.completed);

    const overdueCases = filteredCases
      .filter(isOverdue)
      .map((item) => ({ ...item, lateDays: getLateDays(item) }))
      .sort((first, second) => second.lateDays - first.lateDays);

    const overduePeriodMap = new Map();
    overdueCases.forEach((item) => {
      const period = item.appointmentReturnDate.slice(0, 10);
      overduePeriodMap.set(period, (overduePeriodMap.get(period) ?? 0) + 1);
    });
    const overdueTrend = [...overduePeriodMap.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([period, value]) => ({ period, value }));

    return {
      completedCases,
      departmentData,
      fieldData,
      onTimeRate,
      overdueCases,
      overdueTrend,
      procedureRanking,
      statusData,
      timelineData,
      userPerformance,
    };
  }, [filteredCases]);

  const kpiCards = [
    { label: "Tổng hồ sơ", value: filteredCases.length, icon: Files, tone: "blue" },
    { label: "Đang xử lý", value: filteredCases.filter((item) => item.reportStatus === "Đang xử lý").length, icon: Clock3, tone: "blue" },
    { label: "Đã hoàn thành", value: reportData.completedCases.length, icon: CheckCircle2, tone: "green" },
    { label: "Sắp hạn", value: filteredCases.filter((item) => item.reportStatus === "Sắp hạn").length, icon: FileCheck2, tone: "orange" },
    { label: "Quá hạn", value: reportData.overdueCases.length, icon: TriangleAlert, tone: "red" },
    { label: "Tỷ lệ đúng hạn", value: `${reportData.onTimeRate}%`, icon: BarChart3, tone: "purple" },
  ];

  function changeField(fieldId) {
    setDraftFilters((current) => {
      const procedureIsValid = !current.procedureId
        || procedures.some((item) => item.id === current.procedureId && (!fieldId || item.fieldId === fieldId));
      return { ...current, fieldId, procedureId: procedureIsValid ? current.procedureId : "" };
    });
  }

  function changeDepartment(departmentId) {
    setDraftFilters((current) => {
      const userIsValid = !current.assignedUserId
        || users.some((item) => item.id === current.assignedUserId && (!departmentId || item.departmentId === departmentId));
      return { ...current, departmentId, assignedUserId: userIsValid ? current.assignedUserId : "" };
    });
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  return (
    <section className="reports-page">
      <div className="reports-heading">
        <div>
          <h1>Thống kê &amp; Báo cáo</h1>
          <p>Theo dõi tình hình tiếp nhận, xử lý và tiến độ hồ sơ hành chính.</p>
        </div>
        <div className="report-export-ui">
          <select aria-label="Định dạng báo cáo" value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
          </select>
          <button disabled title="Chưa kết nối API xuất báo cáo" type="button"><Download size={15} /> Xuất báo cáo</button>
        </div>
      </div>

      <form className="report-filter-card" onSubmit={(event) => { event.preventDefault(); setAppliedFilters(draftFilters); }}>
        <label><span>Từ ngày</span><input type="date" value={draftFilters.fromDate} onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label>
        <label><span>Đến ngày</span><input min={draftFilters.fromDate || undefined} type="date" value={draftFilters.toDate} onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))} /></label>
        <label><span>Lĩnh vực</span><select value={draftFilters.fieldId} onChange={(event) => changeField(event.target.value)}><option value="">Tất cả lĩnh vực</option>{fields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Thủ tục hành chính</span><select value={draftFilters.procedureId} onChange={(event) => setDraftFilters((current) => ({ ...current, procedureId: event.target.value }))}><option value="">Tất cả thủ tục</option>{availableProcedures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Phòng ban</span><select value={draftFilters.departmentId} onChange={(event) => changeDepartment(event.target.value)}><option value="">Tất cả phòng ban</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Người xử lý</span><select value={draftFilters.assignedUserId} onChange={(event) => setDraftFilters((current) => ({ ...current, assignedUserId: event.target.value }))}><option value="">Tất cả người xử lý</option>{availableUsers.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
        <label><span>Trạng thái</span><select value={draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Tất cả trạng thái</option>{caseStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <div className="report-filter-actions">
          <button className="report-button report-button--secondary" type="button" onClick={resetFilters}><RotateCcw size={14} /> Đặt lại</button>
          <button className="report-button report-button--primary" type="submit"><Filter size={14} /> Lọc</button>
        </div>
      </form>

      <div className="report-kpi-grid" aria-label="Thống kê tổng quan">
        {kpiCards.map(({ icon: Icon, label, tone, value }) => (
          <article className={`report-kpi report-kpi--${tone}`} key={label}>
            <div><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</strong></div>
            <span className="report-kpi__icon"><Icon size={20} /></span>
          </article>
        ))}
      </div>

      <div className="report-grid report-grid--primary">
        <ReportCard title="Hồ sơ theo thời gian" subtitle="Tiếp nhận và hoàn thành theo ngày">
          <div className="report-chart report-chart--line">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData.timelineData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e9eef5" strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="period" tickFormatter={formatPeriod} tick={{ fill: "#7b899d", fontSize: 9 }} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#7b899d", fontSize: 9 }} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDate} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Line dataKey="received" dot={{ r: 2.5 }} name="Hồ sơ tiếp nhận" stroke="#2775e8" strokeWidth={2} type="monotone" />
                <Line dataKey="completed" dot={{ r: 2.5 }} name="Hồ sơ hoàn thành" stroke="#22a667" strokeWidth={2} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

        <ReportCard title="Cơ cấu trạng thái hồ sơ" subtitle={`${filteredCases.length} hồ sơ theo bộ lọc`}>
          <div className="status-report-layout">
            <div className="report-chart report-chart--donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={reportData.statusData} dataKey="value" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">{reportData.statusData.map((item) => <Cell fill={item.fill} key={item.name} />)}</Pie><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} hồ sơ`]} /></PieChart>
              </ResponsiveContainer>
              <div className="report-donut-total"><strong>{filteredCases.length}</strong><span>hồ sơ</span></div>
            </div>
            <ul className="report-status-legend">{reportData.statusData.map((item) => <li key={item.name}><i style={{ background: item.fill }} /><span>{item.name}</span><strong>{item.value}</strong></li>)}</ul>
          </div>
        </ReportCard>
      </div>

      <div className="report-grid">
        <ReportCard title="Hồ sơ theo lĩnh vực" subtitle="Số hồ sơ của từng lĩnh vực">
          <HorizontalBarChart data={reportData.fieldData} dataKey="value" />
        </ReportCard>
        <ReportCard title="Hồ sơ theo phòng ban" subtitle="Tổng hồ sơ và hồ sơ quá hạn">
          <div className="report-chart report-chart--bar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.departmentData} layout="vertical" margin={{ top: 5, right: 12, left: 16, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#edf1f6" />
                <XAxis allowDecimals={false} axisLine={false} type="number" tick={{ fill: "#7b899d", fontSize: 9 }} tickLine={false} />
                <YAxis axisLine={false} dataKey="name" type="category" width={142} tick={{ fill: "#52627a", fontSize: 9 }} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="total" fill="#2775e8" name="Tổng hồ sơ" radius={[0, 3, 3, 0]} />
                <Bar dataKey="overdue" fill="#ef4444" name="Quá hạn" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>
      </div>

      <ReportCard title="Hồ sơ theo thủ tục hành chính" subtitle="Top 5 thủ tục có nhiều hồ sơ nhất">
        <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Thứ hạng</th><th>Tên thủ tục hành chính</th><th>Lĩnh vực</th><th>Số hồ sơ</th><th>Quá hạn</th></tr></thead><tbody>{reportData.procedureRanking.map((item, index) => <tr key={item.id}><td><span className="ranking-number">{index + 1}</span></td><td className="report-table__long" title={item.name}>{item.name}</td><td>{item.field}</td><td><strong>{item.total}</strong></td><td className={item.overdue ? "report-table__danger" : ""}>{item.overdue}</td></tr>)}{!reportData.procedureRanking.length && <EmptyRow columns={5} />}</tbody></table></div>
      </ReportCard>

      <ReportCard title="Hiệu suất người xử lý" subtitle="Tỷ lệ đúng hạn chỉ tính trên hồ sơ đã hoàn thành">
        <div className="report-table-wrap"><table className="report-table report-table--performance"><thead><tr><th>Người xử lý</th><th>Phòng ban</th><th>Tổng hồ sơ</th><th>Đã hoàn thành</th><th>Đúng hạn</th><th>Trễ hạn</th><th>Tỷ lệ đúng hạn</th></tr></thead><tbody>{reportData.userPerformance.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.department}</td><td>{item.total}</td><td>{item.completed}</td><td>{item.onTime}</td><td className={item.late ? "report-table__danger" : ""}>{item.late}</td><td><div className="rate-cell"><span><i style={{ width: `${item.rate}%` }} /></span><strong>{item.rate}%</strong></div></td></tr>)}{!reportData.userPerformance.length && <EmptyRow columns={7} />}</tbody></table></div>
      </ReportCard>

      <ReportCard title="Xu hướng hồ sơ quá hạn" subtitle="Theo ngày hẹn trả của hồ sơ">
        <div className="report-chart report-chart--overdue">
          {reportData.overdueTrend.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={reportData.overdueTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}><CartesianGrid stroke="#e9eef5" strokeDasharray="3 3" vertical={false} /><XAxis axisLine={false} dataKey="period" tickFormatter={formatPeriod} tick={{ fill: "#7b899d", fontSize: 9 }} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#7b899d", fontSize: 9 }} tickLine={false} /><Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDate} formatter={(value) => [`${value} hồ sơ`, "Quá hạn"]} /><Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <ChartEmptyState />}
        </div>
      </ReportCard>

      <article className="report-card">
        <header className="report-card__header"><div><h2>Hồ sơ quá hạn cần theo dõi</h2><p>Top 10 hồ sơ trễ hẹn trả nhiều nhất</p></div><Link to="/cases">Xem tất cả</Link></header>
        <div className="report-table-wrap"><table className="report-table report-table--overdue"><thead><tr><th>Mã hồ sơ</th><th>Tên hồ sơ / Tên TTHC</th><th>Lĩnh vực</th><th>Phòng ban</th><th>Người xử lý</th><th>Ngày tiếp nhận</th><th>Ngày hẹn trả</th><th>Ngày hoàn tất</th><th>Số ngày trễ</th><th>Trạng thái</th></tr></thead><tbody>{reportData.overdueCases.slice(0, 10).map((item) => <tr key={item.id}><td className="report-table__code">{item.caseCode}</td><td className="report-table__long" title={`${item.caseName} / ${item.procedure?.name ?? ""}`}><strong>{item.caseName}</strong><small>{item.procedure?.name ?? "—"}</small></td><td>{item.field?.name ?? "—"}</td><td>{item.department?.name ?? "—"}</td><td>{item.user?.fullName ?? "—"}</td><td>{formatDate(item.receivedDate)}</td><td>{formatDateTime(item.appointmentReturnDate)}</td><td>{formatDate(item.completedDate)}</td><td><strong className="late-days">{item.lateDays} ngày</strong></td><td><StatusBadge status={item.reportStatus} /></td></tr>)}{!reportData.overdueCases.length && <EmptyRow columns={10} label="Không có hồ sơ quá hạn trong bộ lọc hiện tại." />}</tbody></table></div>
      </article>
    </section>
  );
}

function ReportCard({ children, subtitle, title }) {
  return <article className="report-card"><header className="report-card__header"><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>;
}

function HorizontalBarChart({ data, dataKey }) {
  return <div className="report-chart report-chart--bar">{data.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 5, right: 12, left: 10, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#edf1f6" /><XAxis allowDecimals={false} axisLine={false} type="number" tick={{ fill: "#7b899d", fontSize: 9 }} tickLine={false} /><YAxis axisLine={false} dataKey="name" type="category" width={145} tick={{ fill: "#52627a", fontSize: 9 }} tickLine={false} /><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} hồ sơ`]} /><Bar dataKey={dataKey} fill="#2775e8" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <ChartEmptyState />}</div>;
}

function ChartEmptyState() {
  return <div className="report-empty"><BarChart3 size={27} /><span>Không có dữ liệu phù hợp với bộ lọc.</span></div>;
}

function EmptyRow({ columns, label = "Không có dữ liệu phù hợp với bộ lọc." }) {
  return <tr><td className="report-table__empty" colSpan={columns}>{label}</td></tr>;
}

export default ReportsPage;
