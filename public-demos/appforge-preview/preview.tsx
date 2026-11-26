import { createRoot } from "react-dom/client";
import { PrimeReactProvider } from "primereact/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./styles.css";
import { CustomersPage } from "./generated-ts/customers/pages/CustomersPage.generated";
import { configureHttpClient } from "./generated-ts/runtime/httpClient";
import { createPreviewClient } from "./previewClient";
configureHttpClient(createPreviewClient());
const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false},mutations:{retry:false}}});
createRoot(document.getElementById("root")!).render(
  <PrimeReactProvider value={{inputStyle:"filled",ripple:false}}>
    <QueryClientProvider client={queryClient}>
      <div style={{padding:"12px 20px",background:"#fff6df",color:"#4c390d"}}>
        <a href="../">← Описание демо</a> · AppForge: оригинальный сгенерированный Customer UI, локальный адаптер в памяти, без .NET и БД. Не вводите реальные данные.
        {" "}<button type="button" onClick={()=>location.reload()}>Сбросить демо</button>
      </div>
      <div className="appforge-content"><CustomersPage /></div>
    </QueryClientProvider>
  </PrimeReactProvider>
);
