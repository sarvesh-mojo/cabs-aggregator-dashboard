import { useEffect,useRef, useState } from "react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { DateRangePicker } from "react-date-range";
import "../../css/rangepicker.css";
import { Button } from "antd";
import moment from "moment";
// import { useDispatch, useSelector } from "react-redux";
// import { SaveDateRange } from "../../Redux/slices/operationSlice";
import { createPortal } from "react-dom";



type DateRangeProps = {
  updateDate: [string, string];
  selectedRange: (range: [string, string]) => void;
  compact?: boolean;
};

export const RangerPicker = ({
  updateDate,
  selectedRange,
  compact = false,
}: DateRangeProps) => {
  const [showPicker, setShowPicker] = useState(false);
  // const selectedDateRange = useSelector((state: any) => state.operationStore.SelectedDateRange);


  // const dispatch = useDispatch();
  const compactRef = useRef<HTMLDivElement>(null);

  //  Applied range (final) — use Redux if available, else fallback to prop
  // const [appliedRange, setAppliedRange] = useState<any>(() => {
  //   console.log(selectedDateRange)
  //   if (selectedDateRange && selectedDateRange.length === 2 && selectedDateRange[0] && !compact ) {
  //     return {
  //       startDate: new Date(selectedDateRange[0]),
  //       endDate: new Date(selectedDateRange[1]),
  //       key: "selection",
  //     };
  //   }
  //   return {
  //     startDate: new Date(updateDate[0]),
  //     endDate: new Date(updateDate[1]),
  //     key: "selection",
  //   };
  // });
  const [appliedRange, setAppliedRange] = useState<any>({
  startDate: new Date(updateDate[0]),
  endDate: new Date(updateDate[1]),
  key: "selection",
});
//   const getTodayRange = () => ({
//   startDate: new Date(),
//   endDate: new Date(),
//   key: "selection",
// });

// const [appliedRange, setAppliedRange] = useState<any>(() => {
//   if (selectedDateRange && selectedDateRange.length === 2) {
//     return {
//       startDate: new Date(selectedDateRange[0]),
//       endDate: new Date(selectedDateRange[1]),
//       key: "selection",
//     };
//   }
//   return getTodayRange();
// });
  // console.log(appliedRange)
  //  Temp range (changes while selecting)
  const [tempRange, setTempRange] = useState<any>(appliedRange);
  const commitTimerRef = useRef<number | null>(null);
  const appliedRangeRef = useRef(appliedRange);
  const selectedRangeRef = useRef(selectedRange);
  const pointerSourceRef = useRef<"preset" | "calendar" | "input" | null>(null);
  const pickingEndRef = useRef(false);
  appliedRangeRef.current = appliedRange;
  selectedRangeRef.current = selectedRange;

  const clearCommitTimer = () => {
    if (commitTimerRef.current != null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  };

  useEffect(() => clearCommitTimer, []);

  const commitSelection = (selection: { startDate: Date; endDate: Date }) => {
    if (!selection?.startDate || !selection?.endDate) return;
    const start = moment(selection.startDate);
    const end = moment(selection.endDate);
    if (!start.isValid() || !end.isValid()) return;

    const next: [string, string] = [
      start.format("YYYY-MM-DD"),
      end.format("YYYY-MM-DD"),
    ];
    const current = appliedRangeRef.current;
    const sameRange =
      moment(current.startDate).format("YYYY-MM-DD") === next[0] &&
      moment(current.endDate).format("YYYY-MM-DD") === next[1];

    const applied = { ...selection, key: "selection" };
    appliedRangeRef.current = applied;
    setAppliedRange(applied);
    setTempRange(applied);
    pickingEndRef.current = false;
    setShowPicker(false);
    if (!sameRange) selectedRangeRef.current(next);
  };

  const scheduleCommit = (
    selection: { startDate: Date; endDate: Date },
    delay: number,
  ) => {
    clearCommitTimer();
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      commitSelection(selection);
    }, delay);
  };

  const markPointerSource = (event: { target: EventTarget | null }) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest) return;
    if (target.closest(".rdrStaticRange")) pointerSourceRef.current = "preset";
    else if (target.closest(".rdrInputRange")) pointerSourceRef.current = "input";
    else if (target.closest(".rdrDay")) pointerSourceRef.current = "calendar";
  };

  //  Sync when Redux data arrives (delayed 1s)
  // useEffect(() => {
  //   if (   !compact && selectedDateRange && selectedDateRange.length === 2 && selectedDateRange[0]) {
  //     const synced = {
  //       startDate: new Date(selectedDateRange[0]),
  //       endDate: new Date(selectedDateRange[1]),
  //       key: "selection",
  //     };
  //     setAppliedRange(synced);
  //     setTempRange(synced);
  //   }
  // }, [selectedDateRange, compact]);

    //  compact mode mein updateDate prop change pe sync karo
  useEffect(() => {
    if (compact) {
      const updated = {
        startDate: new Date(updateDate[0]),
        endDate: new Date(updateDate[1]),
        key: "selection",
      };
      setAppliedRange(updated);
      setTempRange(updated);
    }
  }, [updateDate[0], updateDate[1], compact]);

    //  compact mode — click outside se close
  useEffect(() => {
    if (!compact || !showPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        compactRef.current &&
        !compactRef.current.contains(e.target as Node)
      ) {
        clearCommitTimer();
        pickingEndRef.current = false;
        setTempRange(appliedRange);
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [compact, showPicker, appliedRange]);


  const handleSelect = (ranges: any) => {
    const selection = ranges.selection;
    setTempRange(selection);
    const source = pointerSourceRef.current;
    pointerSourceRef.current = null;

    if (source === "calendar") {
      if (!pickingEndRef.current) {
        pickingEndRef.current = true;
        clearCommitTimer();
        return;
      }
      pickingEndRef.current = false;
      scheduleCommit(selection, 0);
      return;
    }

    if (source === "preset") {
      pickingEndRef.current = false;
      scheduleCommit(selection, 0);
      return;
    }

    if (
      source === "input" ||
      document.activeElement instanceof HTMLInputElement
    ) {
      pickingEndRef.current = false;
      scheduleCommit(selection, 400);
    }
  };
  

//   const handleAccept = () => {
//     setAppliedRange(tempRange);
//     selectedRange([
//       moment(tempRange.startDate).format("YYYY-MM-DD"),
//       moment(tempRange.endDate).format("YYYY-MM-DD"),
//     ]);
//     const start = moment(tempRange.startDate).format("YYYY-MM-DD");
//     const end = moment(tempRange.endDate).format("YYYY-MM-DD");
//      dispatch(SaveDateRange([start, end]));
// //     dispatch(SaveDateRange({
// // path: location.pathname, range:[start, end]
// //   }));


//     //  compact mode mein Redux save nahi karna (global range affect na ho)
//     if (!compact) {
//       dispatch(SaveDateRange([start, end]));
//     }


//     setShowPicker(false);
//   };


  const handleCancel = () => {
    clearCommitTimer();
    pickingEndRef.current = false;
    setTempRange(appliedRangeRef.current);
    setShowPicker(false);
  };

  // useEffect(() => {
  //      if (!compact) {
  //   document.body.style.overflow = showPicker ? "hidden" : "visible";
  //      }
  // }, [showPicker,compact]);
  useEffect(() => {
  // Body scroll ko lock mat karo.
  // Cleanup sirf safety ke liye.
  return () => {
    document.body.style.overflow = "";
  };
}, []);
  
  // ─── COMPACT MODE RENDER ─────────────────────────────────────────────────────
  if (compact) {
    return (
      <div ref={compactRef} style={{ position: "relative", display: "inline-block" }}>
        {/* Trigger Button */}
        <Button
          className="btn header-btn"
          onClick={() => setShowPicker((prev) => !prev)}
          size="small"
        >
          <p className="p-1 font-weight-bold mb-0" style={{ fontSize: 12 }}>
            {moment(appliedRange.startDate).format("YYYY-MM-DD")}
            <span className="mx-2">to</span>
            {moment(appliedRange.endDate).format("YYYY-MM-DD")}
          </p>
        </Button>

        {/*  Compact popup — position absolute, opens below button */}
        {showPicker && (
          <div
            onMouseDownCapture={markPointerSource}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 99999,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              border: "1px solid #e5e7eb",
              padding: "12px",
              minWidth: 320,
            }}
          >
            <DateRangePicker
              ranges={[tempRange]}
              onChange={handleSelect}
              months={1}        
              direction="horizontal"
              showMonthAndYearPickers
              rangeColors={["#2563eb"]}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#374151",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  

  // return (
  //   <div className="DateRangePicker">
  //     <Button className="btn header-btn" onClick={() => setShowPicker(true)}>
  //       <p className="p-2 font-weight-bold mb-0">
  //         {moment(appliedRange.startDate).format("YYYY-MM-DD")}
  //         <span className="mx-3">to</span>
  //         {moment(appliedRange.endDate).format("YYYY-MM-DD")}
  //       </p>
  //     </Button>

  //     {showPicker && (
  //       <>
  //         <div className="DatepickerBG" 
  //          style={{
  //       position: "fixed",
  //       inset: 0,
  //       zIndex: 100000,
  //       background: "rgba(0,0,0,0.4)",
  //     }}
  //     />
  //         <div className="picker-container"
  //         style={{
  //       position: "fixed",
  //       top: "50%",
  //       left: "50%",
  //       transform: "translate(-50%, -50%)",
  //       zIndex: 100001,
  //     }}
  //     >
  //           <h5 className="text-center mb-4 font-weight-bold">
  //             Select date range to display data
  //           </h5>

  //           <DateRangePicker
  //             ranges={[tempRange]}
  //             onChange={handleSelect}
  //           />

  //           <div className="flex justify-end mt-3">
  //             <button className="btn btn-primary mr-3" onClick={handleAccept}>
  //               Accept
  //             </button>
  //             <button className="btn btn-secondary" onClick={handleCancel}>
  //               Cancel
  //             </button>
  //           </div>
  //         </div>
  //       </>
  //     )}
  //   </div>
  // );
  return (
    <div className="DateRangePicker">
      <Button className="btn header-btn" onClick={() => setShowPicker(true)}>
        <p className="p-2 font-weight-bold mb-0">
          {moment(appliedRange.startDate).format("YYYY-MM-DD")}
          <span className="mx-3">to</span>
          {moment(appliedRange.endDate).format("YYYY-MM-DD")}
        </p>
      </Button>

      {showPicker &&
        createPortal(
          <>
            <div
              className="DatepickerBG"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100000,
                background: "rgba(0,0,0,0.4)",
              }}
            />
            <div
              className="picker-container"
              onMouseDownCapture={markPointerSource}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 100001,
              }}
            >
              <h5 className="text-center mb-4 font-weight-bold">
                Select date range to display data
              </h5>

              <DateRangePicker
                ranges={[tempRange]}
                onChange={handleSelect}
              />

              <div className="flex justify-end mt-3">
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};