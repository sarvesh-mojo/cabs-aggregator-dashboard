import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import Calendar from "./pages/Calendar";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoutes from "./ProtectedRoutes";
import HandleBooking from "./pages/Dashboard/customerCare/HandleBooking";
import AllBookings from "./pages/Dashboard/customerCare/AllBookings";
import Next2hrBookings from "./pages/Dashboard/customerCare/Next2hrBookings";
import VIP_Bookings from "./pages/Dashboard/customerCare/VIPBookings";
import VipProfiles from "./pages/Dashboard/customerCare/VipProfiles";
import VipEmailDesk from "./pages/Dashboard/customerCare/VipEmailDesk";
import VipDesk from "./pages/Dashboard/customerCare/VipDesk";
import TodayAllPickups from "./pages/Dashboard/customerCare/TodayAllPickupBookings";
import CustomBookingReport from "./pages/Dashboard/customerCare/CustomBookingReport";
import ActiveRides from "./pages/Dashboard/customerCare/ActiveRides";
import Delay_Rides from "./pages/Dashboard/customerCare/DelayRide";
import GmvGraphs from "./pages/Graphs/GmvGraphs";
import CabTypeGraphs from "./pages/Graphs/CabTypeGraphs";
import TripTypeGraphs from "./pages/Graphs/TripTypeGraphs";
import { BookingLogs } from "./pages/Dashboard/analytics/BookingLogs";
import { CancelLogs } from "./pages/Dashboard/analytics/CancelLogs";
import { ConversionLogs } from "./pages/Dashboard/analytics/ConversionLogs";
import { SlaRides } from "./pages/Dashboard/analytics/SlaRides";
import { HomeCX } from "./pages/Dashboard/customerCare/HomeCX";
import { FareSearchReport } from "./pages/Dashboard/analytics/FareSearchReport";
import { FareSearchRideType } from "./pages/Dashboard/analytics/FareSearchRideType";
import { SearchLeadTime } from "./pages/Dashboard/analytics/SearchLeadTime";
import { MetroRouteMap } from "./pages/Dashboard/analytics/MetroRouteMap";
import { FareSearchAnalytics } from "./pages/Dashboard/analytics/FareSearchAnalytics";
import { PartnerPerformance } from "./pages/Dashboard/analytics/PartnerPerformance";
import { CustomTable } from "./components/tables/CustomTable";
import RemarkRecord from "./pages/Dashboard/customerCare/RemarkRecord";
import NpsRecords from "./pages/OtherPage/NpsRecords";
import NpsPartnerDayBoard from "./pages/OtherPage/NpsPartnerDayBoard";
import CeoMetrics from "./pages/Dashboard/customerCare/CeoMetrics";
import CabManagement from "./pages/Dashboard/customerCare/CabMangement";
import MojoAudit from "./pages/Dashboard/customerCare/MojoAudit";
import IbcManagement from "./pages/Dashboard/customerCare/IbcManagement";
import OfferManagement from "./pages/Dashboard/customerCare/OfferManagement";
import AioOffer from "./pages/Dashboard/customerCare/AioOffer";
import TravelVipMargin from "./pages/Dashboard/customerCare/TravelVipMargin";
import OpsFareSearch from "./pages/Dashboard/customerCare/OpsFareSearch";
import OpsBookingLogs from "./pages/Dashboard/customerCare/OpsBookingLogs";
import PartnerPayout from "./pages/Dashboard/customerCare/PartnerPayout";
import PartnerPayoutDay from "./pages/Dashboard/customerCare/PartnerPayoutDay";
import MonthlyPartnerPayout from "./pages/Dashboard/customerCare/MonthlyPartnerPayout";
import CustomerLogs from "./pages/Dashboard/customerCare/CustomerLogs";
import ClockViewPickups from "./pages/Dashboard/customerCare/ClockViewPickups";
import BlueChipReport from "./pages/Dashboard/customerCare/BlueChipReport";
import RideLogs from "./pages/Dashboard/customerCare/RideLogs";
import CashgramPayout from "./pages/Dashboard/customerCare/CashgramPayout";
import ErReport from "./pages/Dashboard/customerCare/ErReport";
import CloudwatchErrors from "./pages/Dashboard/customerCare/CloudwatchErrors";
import AggregatorOverview from "./pages/Dashboard/aggregator/Overview";
import AggregatorBookings from "./pages/Dashboard/aggregator/Bookings";
import AggregatorMarkup from "./pages/Dashboard/aggregator/Markup";


export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Auth Layout */}
          <Route index path="/" element={<SignIn />} />
          <Route path="/login" element={<SignIn />} />

          {/* Dashboard Layout */}
          <Route
            element={
              <ProtectedRoutes>
                <AppLayout />
              </ProtectedRoutes>
            }
          >
            <Route index path="/dashboard" element={<Home />} />

            <Route
              path="/dashboard/aggregator/overview"
              element={<AggregatorOverview />}
            />
            <Route
              path="/dashboard/aggregator/bookings"
              element={<AggregatorBookings />}
            />
            <Route
              path="/dashboard/aggregator/markup"
              element={<AggregatorMarkup />}
            />

            <Route
              index
              path="/dashboard/customerCare/HomeCX"
              element={<HomeCX />}
            />
            <Route
              index
              path="/dashboard/customerCare/Allbookings"
              element={<AllBookings />}
            />
            <Route
              index
              path="/dashboard/customerCare/HandleBooking"
              element={<HandleBooking />}
            />
            <Route
              index
              path="/dashboard/customerCare/Next2HrBooking"
              element={<Next2hrBookings />}
            />
            <Route
              index
              path="/dashboard/customerCare/VIP_Bookings"
              element={<VIP_Bookings />}
            />
            <Route
              path="/dashboard/customerCare/VipProfiles"
              element={<VipProfiles />}
            />
            <Route
              path="/dashboard/customerCare/VipEmailDesk"
              element={<VipEmailDesk />}
            />
            <Route
              path="/dashboard/customerCare/VipDesk"
              element={<VipDesk />}
            />
            <Route
            index
            path="/dashboard/customerCare/Ridelogs"
            element={<RideLogs/>}
            />
            <Route
              index
              path="/dashboard/customerCare/Delay_Rides"
              element={<Delay_Rides />}
            />
            <Route
              index
              path="/dashboard/customerCare/TodayAllPickup"
              element={<TodayAllPickups />}
            />
            <Route
              index
              path="/dashboard/customerCare/CustomBookingReport"
              element={<CustomBookingReport />}
            />

            <Route
              index
              path="/dashboard/customerCare/ActiveRides"
              element={<ActiveRides />}
            />
            <Route
              index
              path="/dashboard/customerCare/RemarkRecord"
              element={<RemarkRecord />}
            />
            <Route
              index
              path="/dashboard/customerCare/CeoMetrics"
              element={<CeoMetrics />}
            />
            <Route
              index
              path="/dashboard/customerCare/TravelVipMargin"
              element={<TravelVipMargin />}
            />
            <Route
              path="/dashboard/customerCare/FareSearch"
              element={<OpsFareSearch />}
            />
            <Route
              path="/dashboard/customerCare/BookingLogs"
              element={<OpsBookingLogs />}
            />

            <Route
              index
              path="/dashboard/customerCare/PartnerPayout"
              element={<PartnerPayout />}
            />
            <Route
              path="/dashboard/customerCare/PartnerPayoutDay"
              element={<PartnerPayoutDay />}
            />
            <Route
              path="/dashboard/customerCare/MonthlyPartnerPayout"
              element={<MonthlyPartnerPayout />}
            />
            <Route
              index
              path="/dashboard/customerCare/CustomerLogs"
              element={<CustomerLogs />}
            />
            <Route
              index
              path="/dashboard/customerCare/ClockViewPickups"
              element={<ClockViewPickups/>}
            />

            <Route
              index
              path="/dashboard/CustomTable"
              element={<CustomTable />}
            />
            <Route
              path="/dashboard/customerCare/CabManagement"
              element={<CabManagement />}
            />
            <Route
              path="/dashboard/customerCare/MojoAudit"
              element={<MojoAudit />}
            />
            <Route
              path="/dashboard/customerCare/IbcManagement"
              element={<IbcManagement />}
            />
            <Route
              path="/dashboard/customerCare/OfferManagement"
              element={<OfferManagement />}
            />
            <Route
              path="/dashboard/customerCare/AioOffer"
              element={<AioOffer />}
            />
            <Route
              path="/dashboard/customerCare/BluechipReport"
              element={<BlueChipReport/>}
            />
             <Route
              path="/dashboard/customerCare/cashgramPayout"
              element={<CashgramPayout/>}
            />
            <Route
              path="/dashboard/customerCare/ErReport"
              element={<ErReport/>}
            />
            <Route
              path="/dashboard/customerCare/CloudwatchErrors"
              element={<CloudwatchErrors />}
            />

            {/*  Graphs */}
            <Route path="/dashboard/graphs/gmv" element={<GmvGraphs />} />
            <Route
              path="/dashboard/graphs/cab-type"
              element={<CabTypeGraphs />}
            />
            <Route
              path="/dashboard/graphs/trip-type"
              element={<TripTypeGraphs />}
            />

            {/*  analytics */}
            <Route
              path="/dashboard/analytics/BookingLogs"
              element={<BookingLogs />}
            />
            <Route
              path="/dashboard/analytics/CancelLogs"
              element={<CancelLogs />}
            />
            <Route
              path="/dashboard/analytics/ConversionLogs"
              element={<ConversionLogs />}
            />
            <Route
              path="/dashboard/analytics/SlaRides"
              element={<SlaRides />}
            />
            <Route
              path="/dashboard/analytics/FareSearchReport"
              element={<FareSearchReport />}
            />
            <Route
              path="/dashboard/analytics/FareSearchRideType"
              element={<FareSearchRideType />}
            />
            <Route
              path="/dashboard/analytics/SearchLeadTime"
              element={<SearchLeadTime />}
            />
            <Route
              path="/dashboard/analytics/MetroRoutes"
              element={<MetroRouteMap />}
            />
            <Route
              path="/dashboard/analytics/FareSearchAnalytics"
              element={<FareSearchAnalytics />}
            />
            <Route
              path="/dashboard/analytics/PartnerPerformance"
              element={<PartnerPerformance />}
            />

            {/* Others Page */}
            <Route
              path="/dashboard/OtherPage/NPSRecord"
              element={<NpsRecords />}
            />
            <Route
              path="/dashboard/OtherPage/NPSDayBoard"
              element={<NpsPartnerDayBoard />}
            />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/comming_soon" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
