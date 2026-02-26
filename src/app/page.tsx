import MoversTable from "@/components/dashboard/MoversTable";
import IHSGChart from "@/components/dashboard/IHSGChart";
import CalendarTable from "@/components/dashboard/CalendarTable";
import TopBrokerTable from "@/components/dashboard/TopBrokerTable";
import MajorIndicesPanel from "@/components/dashboard/MajorIndicesPanel";
import MarketOverviewPanel from "@/components/dashboard/MarketOverviewPanel";
import TechnicalAnalysisWidget from "@/components/dashboard/TechnicalAnalysisWidget";

export default function Home() {
  return (
    // FIX: Gunakan h-full w-full agar mengisi 100% wadah layout yang sudah dikunci
    <div className="p-2 h-full w-full overflow-hidden">
      
      <div className="grid grid-cols-12 gap-2 h-full">
        
        {/* KOLOM 1: Movers Table (Mengambil 3 dari 12 kolom) */}
        <div className="col-span-2 h-full overflow-hidden">
          <MoversTable />
        </div>

        {/* KOLOM 2: Chart IHSG & Calendar (Mengambil 4 dari 12 kolom) */}
        <div className="col-span-5 h-full flex flex-col gap-2 overflow-hidden">
          {/* Porsi tinggi disesuaikan (1.3 bagian untuk chart, 0.7 untuk kalender) */}
          <div className="flex-[1.3] overflow-hidden">
            <IHSGChart />
          </div>
          <div className="flex-[0.7] overflow-hidden">
             <CalendarTable />
          </div>
        </div>

        {/* KOLOM 3: Top Broker / Top Stock (Mengambil 3 dari 12 kolom) */}
        <div className="col-span-3 h-full overflow-hidden">
           <TopBrokerTable />
        </div>

        {/* KOLOM 4: Major Indices, Sectors, & Technical (Mengambil 2 dari 12 kolom) */}
        <div className="col-span-2 h-full flex flex-col gap-2 overflow-hidden">
           {/* Porsi disesuaikan agar panel indikator teknikal paling bawah muat sempurna */}
           <div className="flex-[0.8] overflow-hidden">
             <MajorIndicesPanel />
           </div>
           <div className="flex-[0.9] overflow-hidden">
             <MarketOverviewPanel />
           </div>
           <div className="flex-[0.8] overflow-hidden">
             <TechnicalAnalysisWidget />
           </div>
        </div>

      </div>
      
    </div>
  );
}