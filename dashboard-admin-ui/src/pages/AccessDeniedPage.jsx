import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

import "./AccessDeniedPage.css";

function AccessDeniedPage() {
  return (
    <section className="access-denied-page">
      <div className="access-denied-card">
        <span className="access-denied-card__icon" aria-hidden="true">
          <ShieldX size={30} />
        </span>
        <strong>403</strong>
        <h1>Không có quyền truy cập</h1>
        <p>Bạn không có quyền truy cập chức năng này.</p>
        <Link to="/">Quay về Dashboard</Link>
      </div>
    </section>
  );
}

export default AccessDeniedPage;
