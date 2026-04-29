import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add CourierAppRoot to AppContent
courier_logic = """
  const appMode = import.meta.env.VITE_APP_MODE;
  if (appMode === 'courier') {
    if (isAuthenticated && user?.role === 'courier') {
      return <CourierDashboard />;
    }
    return <CourierLogin />;
  }
"""

content = content.replace("function AppContent() {\n  const { user, isAuthenticated } = useAuth();", "function AppContent() {\n  const { user, isAuthenticated } = useAuth();\n" + courier_logic)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed")
