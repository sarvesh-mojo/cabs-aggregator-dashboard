// import { useSelector } from "react-redux";
// import { useLocation } from "react-router-dom";
// import moment from "moment";

// export const useDateRange = () => {
//   const location = useLocation();

//   const range = useSelector(
//     (state: any) => state.operationStore.SelectedDateRange?.[location.pathname]
//   );

//   if (range && range.length === 2) {
//     return range;
//   }

//   const today = moment().format("YYYY-MM-DD");
//   return [today, today];
// };