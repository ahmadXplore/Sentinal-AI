"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import api from "../lib/api";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "📊",
    roles: ["admin", "analyst", "viewer"],
  },
  {
    href: "/logs",
    label: "Log Management",
    icon: "📋",
    roles: ["admin", "analyst", "viewer"],
  },
  {
    href: "/alerts",
    label: "Threat Alerts",
    icon: "🚨",
    roles: ["admin", "analyst", "viewer"],
  },
  {
    href: "/incidents",
    label: "Incident Reports",
    icon: "💼",
    roles: ["admin", "analyst", "viewer"],
  },
  { href: "/rules", label: "Detection Rules", icon: "🛡️", roles: ["admin", "analyst"] },
  { href: "/hunting", label: "ML Threat Analysis", icon: "🔬", roles: ["admin", "analyst"] },
  { href: "/admin", label: "User Management", icon: "👥", roles: ["admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openCount, setOpenCount] = useState(0);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const fetchAlertCount = () => {
      api
        .getAlerts(1, 1, { status: "open" })
        .then((res) => setOpenCount(res.data?.pagination?.total || 0))
        .catch(() => {});
    };

    if (!fetchedRef.current) {
      fetchAlertCount();
      fetchedRef.current = true;
    }

    const intervalId = setInterval(fetchAlertCount, 60000); // Poll every minute
    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <aside
      className="no-print"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "var(--sidebar-width)",
        height: "100vh",
        background: "rgba(17, 24, 39, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid var(--border-primary)",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 22px",
          borderBottom: "1px solid var(--border-primary)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "var(--radius-md)",
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            boxShadow: "0 4px 15px var(--accent-primary-glow)",
          }}
        >
          🛡️
        </div>
        <div>
          <h1
            style={{
              fontSize: "1.15rem",
              fontWeight: 800,
              background: "var(--gradient-primary)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.2,
            }}
          >
            SentinelAI
          </h1>
          <p
            style={{
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
            }}
          >
            SOC Platform
          </p>
        </div>
      </div>

      {/* Section Label */}
      <div
        style={{
          padding: "20px 22px 8px",
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        Navigation
      </div>

      {/* Nav Items */}
      <nav style={{ padding: "0 12px", flex: 1 }}>
        {navItems
          .filter((item) => item.roles.includes(user?.role || "viewer"))
          .map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "4px",
                  fontSize: "0.88rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)"
                    : "transparent",
                  borderLeft: isActive
                    ? "3px solid var(--accent-primary)"
                    : "3px solid transparent",
                  transition: "all var(--transition-base)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.label === "Threat Alerts" && openCount > 0 && (
                  <span
                    style={{
                      background: "var(--color-critical)",
                      color: "#fff",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      lineHeight: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "18px",
                      height: "18px",
                    }}
                  >
                    {openCount}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Bottom Section */}
      <div
        style={{
          padding: "16px 22px",
          borderTop: "1px solid var(--border-primary)",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            background: "var(--gradient-glow)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--accent-primary-hover)",
              marginBottom: "4px",
            }}
          >
            🤖 AI Model
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Sentinel AI
          </div>
        </div>
      </div>
    </aside>
  );
}
