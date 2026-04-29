with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("""function CourierAppRoot() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.role === 'courier') {
    return <CourierDashboard />;
  }
  return <CourierLogin />;
}

""", "")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed")
