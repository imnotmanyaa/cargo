import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

courier_root = """
function CourierAppRoot() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.role === 'courier') {
    return <CourierDashboard />;
  }
  return <CourierLogin />;
}

export default function App() {
"""

content = content.replace("export default function App() {", courier_root)

mode_check = """
  const appMode = import.meta.env.VITE_APP_MODE;
  if (appMode === 'courier') {
    return <CourierAppRoot />;
  }
"""

content = re.sub(r'(export default function App\(\) \{\n(?:.*\n){0,3}?)(\s+const \[isDark, setIsDark\])', r'\1' + mode_check + r'\2', content)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("App updated")
