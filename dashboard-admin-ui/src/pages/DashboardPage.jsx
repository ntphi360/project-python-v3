import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { Link } from "react-router-dom";
import "./DashboardPage.css";

import {
  CircleCheckBig,
  Clock3,
  Files,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import {
  CartesianGrid,
  Label,
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

// Phần biểu đồ theo thời gian sẽ làm sau
const timelineData = [];

const chartTooltipStyle = {
  border: "1px solid #e4eaf2",
  borderRadius: 8,
  boxShadow: "0 6px 18px rgba(32, 56, 85, 0.1)",
  fontSize: 12,
};


function DonutCenterLabel({ total, viewBox }) {
  const { cx, cy } = viewBox ?? {};

  if (
    typeof cx !== "number" ||
    typeof cy !== "number"
  ) {
    return null;
  }

  return (
    <g className="status-chart__center-label">
      <text
        className="status-chart__total"
        x={cx}
        y={cy - 6}
        textAnchor="middle"
      >
        {total.toLocaleString("vi-VN")}
      </text>

      <text
        className="status-chart__caption"
        x={cx}
        y={cy + 12}
        textAnchor="middle"
      >
        hồ sơ
      </text>
    </g>
  );
}


function DashboardPage() {
  const [summary, setSummary] = useState({
    total: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0,
  });

  const [statusData, setStatusData] = useState([]);
  const [attentionCases, setAttentionCases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

      const response = await fetch(
    `${API_BASE_URL}/dashboard`
        );

        if (!response.ok) {
          throw new Error(
            `Dashboard API error: ${response.status}`
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.message || "Không thể lấy dữ liệu dashboard"
          );
        }

        setSummary(
          result.data?.summary ?? {
            total: 0,
            upcoming: 0,
            overdue: 0,
            completed: 0,
          }
        );

        const statusColors = {
          "Đang xử lý": "#2775e8",
          "Đã hoàn thành": "#22a667",
          "Quá hạn": "#e5484d",
          "Sắp hạn": "#f59e0b",
        };

        const statusList =
          result.data?.statusData ?? [];

        setStatusData(
          statusList.map((item) => ({
            ...item,
            fill:
              statusColors[item.name] ||
              "#94a3b8",
          }))
        );

        setAttentionCases(
          result.data?.attentionCases ?? []
        );
      } catch (error) {
        console.error(
          "Lỗi lấy dữ liệu dashboard:",
          error
        );

        setError(
          "Không thể tải dữ liệu dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);


  const kpiCards = useMemo(
    () => [
      {
        title: "Tổng hồ sơ",
        value: summary.total,
        change: "Tổng số hồ sơ",
        trend: "up",
        icon: Files,
        tone: "blue",
      },
      {
        title: "Hồ sơ sắp hạn",
        value: summary.upcoming,
        change: "Cần xử lý sớm",
        trend: "down",
        icon: Clock3,
        tone: "orange",
      },
      {
        title: "Hồ sơ quá hạn",
        value: summary.overdue,
        change: "Đã quá hạn xử lý",
        trend: "down",
        icon: TriangleAlert,
        tone: "red",
      },
      {
        title: "Đã hoàn thành",
        value: summary.completed,
        change: "Đã xử lý xong",
        trend: "up",
        icon: CircleCheckBig,
        tone: "green",
      },
    ],
    [summary]
  );


  const totalStatusCases = statusData.reduce(
    (total, item) => total + item.value,
    0
  );


  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-empty">
          Đang tải dữ liệu...
        </div>
      </section>
    );
  }


  if (error) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-empty">
          {error}
        </div>
      </section>
    );
  }


  return (
    <section className="dashboard-page">
      <div className="dashboard-page__heading">
        <h1>Dashboard</h1>

        <p>
          Tổng quan tình hình quản lý hồ sơ
          trong hệ thống.
        </p>
      </div>


      <div
        className="kpi-grid"
        aria-label="Thống kê tổng quan hồ sơ"
      >
        {kpiCards.map(
          ({
            title,
            value,
            change,
            trend,
            icon: Icon,
            tone,
          }) => {
            const TrendIcon =
              trend === "up"
                ? TrendingUp
                : TrendingDown;

            return (
              <article
                className={`kpi-card kpi-card--${tone}`}
                key={title}
              >
                <div className="kpi-card__top">
                  <span className="kpi-card__title">
                    {title}
                  </span>

                  <span
                    className="kpi-card__icon"
                    aria-hidden="true"
                  >
                    <Icon
                      size={21}
                      strokeWidth={2}
                    />
                  </span>
                </div>

                <strong className="kpi-card__value">
                  {value.toLocaleString("vi-VN")}
                </strong>

                <div
                  className={`kpi-card__change kpi-card__change--${trend}`}
                >
                  <TrendIcon
                    size={14}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />

                  <span>{change}</span>
                </div>
              </article>
            );
          }
        )}
      </div>


      <div className="dashboard-charts">
        <article className="dashboard-card dashboard-card--status-chart">
          <div className="dashboard-card__header">
            <div>
              <h2>
                Thống kê hồ sơ theo trạng thái
              </h2>

              <p>
                Phân bổ hồ sơ hiện tại
              </p>
            </div>
          </div>


          <div
            className="status-chart"
            aria-label="Biểu đồ hồ sơ theo trạng thái"
          >
            <div className="status-chart__plot">
              {statusData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="57%"
                      outerRadius="82%"
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      <Label
                        content={(labelProps) => (
                          <DonutCenterLabel
                            {...labelProps}
                            total={
                              totalStatusCases
                            }
                          />
                        )}
                      />
                    </Pie>

                    <Tooltip
                      contentStyle={
                        chartTooltipStyle
                      }
                      formatter={(value) => [
                        `${value} hồ sơ`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-empty">
                  Chưa có dữ liệu
                </div>
              )}
            </div>


            <ul
              className="status-chart__legend"
              aria-label="Chú thích trạng thái hồ sơ"
            >
              {statusData.map((item) => (
                <li
                  key={item.name}
                  style={{
                    "--legend-color":
                      item.fill,
                  }}
                >
                  <span
                    className="status-chart__legend-dot"
                    aria-hidden="true"
                  />

                  <span className="status-chart__legend-content">
                    <strong>
                      {item.name}
                    </strong>

                    <small>
                      {totalStatusCases > 0
                        ? Math.round(
                            (
                              item.value /
                              totalStatusCases
                            ) * 100
                          )
                        : 0}
                      % ·{" "}
                      {item.value.toLocaleString(
                        "vi-VN"
                      )}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </article>


        <article className="dashboard-card dashboard-card--line-chart">
          <div className="dashboard-card__header">
            <div>
              <h2>
                Hồ sơ theo thời gian
              </h2>

              <p>
                Tình hình tiếp nhận và hoàn thành
                gần đây
              </p>
            </div>
          </div>


          <div
            className="timeline-chart"
            aria-label="Biểu đồ hồ sơ theo thời gian"
          >
            {timelineData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={timelineData}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -18,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#e9eef5"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    axisLine={false}
                    dataKey="period"
                    tick={{
                      fill: "#7b899d",
                      fontSize: 11,
                    }}
                    tickLine={false}
                    tickMargin={10}
                  />

                  <YAxis
                    axisLine={false}
                    tick={{
                      fill: "#7b899d",
                      fontSize: 11,
                    }}
                    tickLine={false}
                    tickMargin={8}
                  />

                  <Tooltip
                    contentStyle={
                      chartTooltipStyle
                    }
                  />

                  <Legend
                    align="center"
                    iconSize={9}
                    iconType="circle"
                    verticalAlign="bottom"
                    wrapperStyle={{
                      paddingTop: 8,
                      fontSize: 10,
                    }}
                  />

                  <Line
                    activeDot={{ r: 5 }}
                    dataKey="received"
                    dot={{ r: 3 }}
                    name="Hồ sơ tiếp nhận"
                    stroke="#2775e8"
                    strokeWidth={2.2}
                    type="monotone"
                    isAnimationActive={false}
                  />

                  <Line
                    activeDot={{ r: 5 }}
                    dataKey="completed"
                    dot={{ r: 3 }}
                    name="Hồ sơ hoàn thành"
                    stroke="#22a667"
                    strokeWidth={2.2}
                    type="monotone"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-empty">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </article>
      </div>


      <article className="dashboard-card records-card">
        <div className="dashboard-card__header">
          <div>
            <h2>
              Hồ sơ cần chú ý
            </h2>
          </div>

          <Link
            className="records-card__link"
            to="/cases"
          >
            Xem tất cả
          </Link>
        </div>


        <div className="records-table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th scope="col">
                  Mã hồ sơ
                </th>

                <th scope="col">
                  Chủ hồ sơ
                </th>

                <th scope="col">
                  Thủ tục
                </th>

                <th scope="col">
                  Ngày hẹn trả
                </th>

                <th scope="col">
                  Người xử lý
                </th>

                <th scope="col">
                  Trạng thái
                </th>
              </tr>
            </thead>


            <tbody>
              {attentionCases.map(
                (caseItem) => (
                  <tr key={caseItem.id}>
                    <td className="records-table__code">
                      {caseItem.caseCode ??
                        "—"}
                    </td>

                    <td>
                      {caseItem.applicantName ??
                        "—"}
                    </td>

                    <td>
                      {caseItem.procedureName ??
                        "—"}
                    </td>

                    <td>
                      {caseItem.appointmentDate
                        ? new Date(
                            caseItem.appointmentDate
                          ).toLocaleDateString(
                            "vi-VN"
                          )
                        : "—"}
                    </td>

                    <td>
                      {caseItem.assigneeName ??
                        "—"}
                    </td>

                    <td>
                      {caseItem.status ??
                        "—"}
                    </td>
                  </tr>
                )
              )}

              {!attentionCases.length && (
                <tr>
                  <td
                    colSpan="6"
                    className="records-table__empty"
                  >
                    Chưa có dữ liệu hồ sơ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}


export default DashboardPage;