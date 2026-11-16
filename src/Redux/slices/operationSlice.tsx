import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface OperationState {
  selectedPartner: string;
  ReportSelectedPartner: string;
  SelectedDateRange : {}
  // SelectedDateRange: Record<string, [string, string]>;
}

const initialState: OperationState = {
  selectedPartner: "",
  ReportSelectedPartner: "",
  SelectedDateRange: {},
};

export const operationSlice = createSlice({
  name: "Operation_Slice",
  initialState,
  reducers: {
    SaveActivePartner: (state, action: PayloadAction<any>) => {
      state.selectedPartner = action.payload;
    },
    SaveReportActivePartner: (state, action: PayloadAction<any>) => {
      state.ReportSelectedPartner = action.payload;
    },
     SaveDateRange: (state, action: PayloadAction<any>) => {
      state.SelectedDateRange = action.payload;
    }
  }
  //   SaveDateRange: (
  //     state,
  //     action: PayloadAction<{ path: string; range: [string, string] }>,
  //   ) => {
  //     const { path, range } = action.payload;
  //     //  full safety
  //     if (
  //       !state.SelectedDateRange ||
  //       Array.isArray(state.SelectedDateRange) ||
  //       typeof state.SelectedDateRange !== "object"
  //     ) {
  //       state.SelectedDateRange = {};
  //     }

  //     // validate payload
  //     if (!path || !Array.isArray(range) || range.length !== 2) {
  //       console.warn("Invalid SaveDateRange payload", action.payload);
  //       return;
  //     }

  //     state.SelectedDateRange[path] = range;

  //     // console.log(typeof state.SelectedDateRange);
  //   },
  // },
});

export const { SaveActivePartner, SaveDateRange, SaveReportActivePartner } =
  operationSlice.actions;
export default operationSlice.reducer;
