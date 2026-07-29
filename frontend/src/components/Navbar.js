"use client";

import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav
      className="no-print"
      style={{
        position: "fixed",
        top: 0,
        left: "var(--sidebar-width)",
        right: 0,
        height: "var(--navbar-height)",
        background: "rgba(10, 14, 26, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {" • "}
          <span style={{ color: "var(--color-low)" }}>System Online</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* AI Status Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            background: "var(--accent-primary-glow)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--accent-primary-hover)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--accent-primary)",
              animation: "glow 2s infinite",
            }}
          ></span>
          AI Engine
        </div>

        {/* User Info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 14px",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {user?.username || "User"}
            </div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {user?.role || "analyst"}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{ fontSize: "0.8rem" }}
          id="logout-button"
        >
          ⏻ Logout
        </button>
      </div>
    </nav>
  );
}
