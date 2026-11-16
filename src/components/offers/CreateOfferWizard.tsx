// import { useState } from "react";
// import {
//   WIZARD_STEPS,
//   WEEK_DAYS,
//   OfferForm,
//   RulePresets,
//   LimitsForm,
//   CustomRule,
//   CreateResult,
//   OfferRule,
//   buildRules,
//   hasLimits,
//   buildOfferPayload,
//   buildReviewRows,
//   buildLimitsPayload,
// } from "../../utils/aioOfferHelpers";
// import {
//   CUSTOM_GENERIC_CREATE,
//   CUSTOM_GENERIC_UPDATE,
// } from "../../config/customerCare/operationsApicall";

// interface CreateOfferWizardProps {
//   partner: string;
//   offerForm: OfferForm;
//   setOfferForm: React.Dispatch<React.SetStateAction<OfferForm>>;
//   rulePresets: RulePresets;
//   setRulePresets: React.Dispatch<React.SetStateAction<RulePresets>>;
//   limitsForm: LimitsForm;
//   setLimitsForm: React.Dispatch<React.SetStateAction<LimitsForm>>;
//   customRules: CustomRule[];
//   setCustomRules: React.Dispatch<React.SetStateAction<CustomRule[]>>;
//   onReset: () => void;
//   isEditMode: boolean;
//   editingOfferId: string | null;
//   onUpdateSuccess: () => void;
//   offerRuleIds: Record<string, number>;
//   offerLimitId: number | null;
// }

// export function CreateOfferWizard({
//   partner,
//   offerForm,
//   setOfferForm,
//   rulePresets,
//   setRulePresets,
//   limitsForm,
//   setLimitsForm,
//   customRules,
//   setCustomRules,
//   onReset,
//   isEditMode,
//   editingOfferId,
//   offerRuleIds,
//   offerLimitId,
//   onUpdateSuccess,
// }: CreateOfferWizardProps) {
//   const [createStep, setCreateStep] = useState(0);
//   const [creating, setCreating] = useState(false);
//   const [createResults, setCreateResults] = useState<CreateResult[]>([]);

//   const reviewRules = buildRules(
//     offerForm.offer_id,
//     rulePresets,
//     customRules,
//     offerForm.min_cart_value,
//   );
//   const reviewRows = buildReviewRows(offerForm);
//   const reviewHasLimits = hasLimits(limitsForm);

//   const goToStep = (idx: number) => {
//     if (idx >= 0 && idx < WIZARD_STEPS.length) setCreateStep(idx);
//   };

//   const validateStep0 = () => {
//     if (!offerForm.offer_id) {
//       alert("Offer ID is required");
//       return false;
//     }
//     if (!offerForm.name) {
//       alert("Internal name is required");
//       alert("Internal name is required");
//       return false;
//     }
//     if (!offerForm.title) {
//       alert("Display title is required");
//       return false;
//     }
//     if (!offerForm.discount_value) {
//       alert("Discount value is required");
//       return false;
//     }
//     return true;
//   };

//   const nextStep = () => {
//     if (createStep === 0 && !validateStep0()) return;
//     if (createStep < WIZARD_STEPS.length - 1) setCreateStep(createStep + 1);
//   };

//   const prevStep = () => {
//     if (createStep > 0) setCreateStep(createStep - 1);
//   };

//   const addCustomRule = () => {
//     setCustomRules((prev) => [
//       ...prev,
//       { rule_type: "user_type", operator: "=", value: "" },
//     ]);
//   };

//   const removeCustomRule = (idx: number) => {
//     setCustomRules((prev) => prev.filter((_, i) => i !== idx));
//   };

//   const createWithResult = async (
//     table: string,
//     data: Record<string, string>,
//     label?: string,
//   ): Promise<CreateResult> => {
//     try {
//       const res = await CUSTOM_GENERIC_CREATE(partner, { table, data });
//       return {
//         table,
//         status: "success",
//         message: `${label || table} — ${res?.message || "OK"}`,
//       };
//     } catch (err: any) {
//       return {
//         table,
//         status: "error",
//         message: `${label || table} — ${err?.response?.data?.message || "Failed"}`,
//       };
//     }
//   };

//   const submitOffer = async () => {
//     if (!offerForm.offer_id) {
//       alert("Offer ID is required");
//       setCreateStep(0);
//       return;
//     }
//     //  console.log("clicked");
//     // console.log("isEditMode:", isEditMode);
//     // console.log("editingOfferId:", editingOfferId);
//     // console.log("offerForm.discount_value:", offerForm.discount_value);
//     // console.log("Full payload:", buildOfferPayload(offerForm, true));

//     setCreating(true);
//     setCreateResults([]);
//     const results: CreateResult[] = [];
//     if (isEditMode) {
//       // UPDATE flow
//       try {
//         //  console.log("Updating offer with data:", buildOfferPayload(offerForm, true));

//         const res = await CUSTOM_GENERIC_UPDATE(partner, {
//           table: "offers",
//           id: editingOfferId,
//           data: buildOfferPayload(offerForm, true),
//         });
//         //  console.log("Update response:", res);

//         results.push({
//           table: "offers",
//           status: "success",
//           message: `Updated — ${res?.message || "OK"}`,
//         });

//         const rules = buildRules(
//           offerForm.offer_id,
//           rulePresets,
//           customRules,
//           offerForm.min_cart_value,
//         );

//         for (const rule of rules) {
//           const ruleId = offerRuleIds[rule.rule_type];

//           if (!ruleId) continue;

//           await CUSTOM_GENERIC_UPDATE(partner, {
//             table: "offer_rules",
//             id: ruleId,
//             data: rule,
//           });
//         }

//         if (offerLimitId) {
//           await CUSTOM_GENERIC_UPDATE(partner, {
//             table: "offer_limits",
//             id: offerLimitId,
//             data: buildLimitsPayload(offerForm.offer_id, limitsForm),
//           });
//         }
//       } catch (err: any) {
//         results.push({
//           table: "offers",
//           status: "error",
//           message: err?.response?.data?.message || "Update failed",
//         });
//       }
//     } else {
//       const offerResult = await createWithResult(
//         "offers",
//         buildOfferPayload(offerForm, true),
//         "Main offer",
//       );
//       results.push(offerResult);

//       const rules = buildRules(
//         offerForm.offer_id,
//         rulePresets,
//         customRules,
//         offerForm.min_cart_value,
//       );
//       for (const rule of rules) {
//         const r = await createWithResult(
//           "offer_rules",
//           rule as unknown as Record<string, string>,
//           `${rule.rule_type} ${rule.operator}`,
//         );
//         results.push(r);
//       }

//       if (hasLimits(limitsForm)) {
//         const limitResult = await createWithResult(
//           "offer_limits",
//           buildLimitsPayload(offerForm.offer_id, limitsForm),
//           "Limits",
//         );
//         results.push(limitResult);
//       }
//     }

//     setCreateResults(results);
//     setCreating(false);
//     //  onUpdateSuccess();
//     setTimeout(() => onUpdateSuccess(), 0);
//   };

//   const updateOfferField = (key: keyof OfferForm, value: string) => {
//     // console.log("Updating", key, "to", value);
//     setOfferForm((prev) => ({ ...prev, [key]: value }));
//   };

//   const updateRulePreset = (key: keyof RulePresets, value: string) => {
//     setRulePresets((prev) => ({ ...prev, [key]: value }));
//   };

//   const updateLimitsField = (key: keyof LimitsForm, value: string) => {
//     setLimitsForm((prev) => ({ ...prev, [key]: value }));
//   };

//   return (
//     <div>
//       <div className="flex gap-2 mb-6 border-b pb-4 flex-wrap">
//         {WIZARD_STEPS.map((step, idx) => (
//           <button
//             key={step}
//             type="button"
//             onClick={() => goToStep(idx)}
//             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
//               createStep === idx
//                 ? "bg-orange-500 text-white shadow"
//                 : idx < createStep
//                   ? "bg-green-100 text-green-700"
//                   : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             {idx + 1}. {step}
//           </button>
//         ))}
//       </div>

//       {createStep === 0 && (
//         <div className="bg-gray-50 p-6 rounded-xl border">
//           <h4 className="text-lg font-semibold mb-1">
//             Step 1 — Main Offer Details
//           </h4>
//           <p className="text-gray-500 text-sm mb-5">
//             Configure the core offer. This creates a record in the{" "}
//             <strong>offers</strong> table.
//           </p>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//             <Field label="Offer ID" required>
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.offer_id}
//                 onChange={(e) => updateOfferField("offer_id", e.target.value)}
//                 placeholder="e.g. MEGA150"
//               />
//               <span className="text-xs text-gray-400">
//                 Unique identifier — no spaces
//               </span>
//             </Field>
//             <Field label="Internal Name" required>
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.name}
//                 onChange={(e) => updateOfferField("name", e.target.value)}
//                 placeholder="e.g. Mega Weekend Offer"
//               />
//             </Field>
//             <Field label="Display Title" required>
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.title}
//                 onChange={(e) => updateOfferField("title", e.target.value)}
//                 placeholder="e.g. Flat ₹150 OFF"
//               />
//             </Field>
//             <Field label="Display Subtitle">
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.subtitle}
//                 onChange={(e) => updateOfferField("subtitle", e.target.value)}
//               />
//             </Field>
//             <Field label="Discount Type" required>
//               <select
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.type}
//                 onChange={(e) =>
//                   updateOfferField("type", e.target.value as OfferForm["type"])
//                 }
//               >
//                 <option value="flat">Flat (₹ amount off)</option>
//                 <option value="percentage">Percentage (% off)</option>
//               </select>
//             </Field>
//             <Field
//               label={
//                 offerForm.type === "percentage"
//                   ? "Discount %"
//                   : "Discount Amount (₹)"
//               }
//               required
//             >
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.discount_value}
//                 onChange={(e) =>
//                   updateOfferField("discount_value", e.target.value)
//                 }
//               />
//             </Field>
//             {offerForm.type === "percentage" && (
//               <Field label="Max Discount Cap (₹)">
//                 <input
//                   type="number"
//                   className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                   value={offerForm.max_discount}
//                   onChange={(e) =>
//                     updateOfferField("max_discount", e.target.value)
//                   }
//                 />
//               </Field>
//             )}
//             <Field label="Minimum Cart Value (₹)">
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.min_cart_value}
//                 onChange={(e) =>
//                   updateOfferField("min_cart_value", e.target.value)
//                 }
//               />
//             </Field>
//             <Field label="Priority">
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.priority}
//                 onChange={(e) => updateOfferField("priority", e.target.value)}
//               />
//             </Field>
//             <Field label="Stackable">
//               <select
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.is_stackable}
//                 onChange={(e) =>
//                   updateOfferField("is_stackable", e.target.value)
//                 }
//               >
//                 <option value="0">No — Non-stackable</option>
//                 <option value="1">Yes — Stackable</option>
//               </select>
//             </Field>
//             <Field label="Status">
//               <select
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.status}
//                 onChange={(e) => updateOfferField("status", e.target.value)}
//               >
//                 <option value="active">Active</option>
//                 <option value="expired">Expired</option>
//               </select>
//             </Field>
//             <Field label="Client ID">
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.client_id}
//                 onChange={(e) => updateOfferField("client_id", e.target.value)}
//               />
//             </Field>
//             <Field label="User Visibility">
//               <select
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.userVisibility}
//                 onChange={(e) =>
//                   updateOfferField("userVisibility", e.target.value)
//                 }
//               >
//                 <option value="1">Visible to users</option>
//                 <option value="0">Hidden</option>
//               </select>
//             </Field>
//             <Field label="Start Time">
//               <input
//                 type="datetime-local"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.start_time_local}
//                 onChange={(e) =>
//                   updateOfferField("start_time_local", e.target.value)
//                 }
//               />
//             </Field>
//             <Field label="End Time">
//               <input
//                 type="datetime-local"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={offerForm.end_time_local}
//                 onChange={(e) =>
//                   updateOfferField("end_time_local", e.target.value)
//                 }
//               />
//             </Field>
//             <div className="md:col-span-2 lg:col-span-3">
//               <Field label="Description">
//                 <input
//                   className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                   value={offerForm.description}
//                   onChange={(e) =>
//                     updateOfferField("description", e.target.value)
//                   }
//                 />
//               </Field>
//             </div>
//             <div className="md:col-span-2 lg:col-span-3">
//               <Field label="Terms & Conditions">
//                 <textarea
//                   className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm min-h-[80px]"
//                   value={offerForm.tnc}
//                   onChange={(e) => updateOfferField("tnc", e.target.value)}
//                   placeholder="e.g. Applicable once per user."
//                 />
//               </Field>
//             </div>
//           </div>
//         </div>
//       )}

//       {createStep === 1 && (
//         <div className="bg-gray-50 p-6 rounded-xl border">
//           <h4 className="text-lg font-semibold mb-1">
//             Step 2 — Targeting Rules{" "}
//             <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-1">
//               Optional
//             </span>
//           </h4>
//           <p className="text-gray-500 text-sm mb-5">
//             Define who can use this offer. Each rule is saved to{" "}
//             <strong>offer_rules</strong>.
//           </p>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
//             <Field label="User Type">
//               <select
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.user_type}
//                 onChange={(e) => updateRulePreset("user_type", e.target.value)}
//               >
//                 <option value="">Any user</option>
//                 <option value="loggedin">Logged-in users only</option>
//                 <option value="guest">Guest users only</option>
//               </select>
//             </Field>
//             <Field label="Device Type">
//               <select
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.device_type}
//                 onChange={(e) =>
//                   updateRulePreset("device_type", e.target.value)
//                 }
//               >
//                 <option value="">Any device</option>
//                 <option value="android">Android only</option>
//                 <option value="ios">iOS only</option>
//                 <option value="web">Web only</option>
//               </select>
//             </Field>
//             <Field label="Cab Partner">
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.cab_partner}
//                 onChange={(e) =>
//                   updateRulePreset("cab_partner", e.target.value)
//                 }
//                 placeholder="e.g. BLUSMART"
//               />
//             </Field>
//             <Field label="Cities (comma-separated)">
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.cities}
//                 onChange={(e) => updateRulePreset("cities", e.target.value)}
//                 placeholder="e.g. DELHI, MUMBAI, BLR"
//               />
//             </Field>
//             <Field label="Exclude Cities">
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.exclude_cities}
//                 onChange={(e) =>
//                   updateRulePreset("exclude_cities", e.target.value)
//                 }
//               />
//             </Field>
//             <Field label="New User Only">
//               <select
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.is_new_user}
//                 onChange={(e) =>
//                   updateRulePreset("is_new_user", e.target.value)
//                 }
//               >
//                 <option value="">No restriction</option>
//                 <option value="true">New users only</option>
//               </select>
//             </Field>
//             <Field label="Max Ride Count (less than)">
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.ride_count}
//                 onChange={(e) => updateRulePreset("ride_count", e.target.value)}
//               />
//             </Field>
//             <Field label="Customer IDs (comma-separated)">
//               <input
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.customer_ids}
//                 onChange={(e) =>
//                   updateRulePreset("customer_ids", e.target.value)
//                 }
//               />
//             </Field>
//           </div>

//           <h5 className="font-medium text-gray-700 mb-3">
//             Schedule (Weekend / Time-based)
//           </h5>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Active Days
//               </label>
//               <div className="flex flex-wrap gap-3">
//                 {WEEK_DAYS.map((day) => (
//                   <label key={day} className="flex items-center gap-1 text-sm">
//                     <input
//                       type="checkbox"
//                       checked={rulePresets.scheduleDays[day] || false}
//                       onChange={(e) =>
//                         setRulePresets((prev) => ({
//                           ...prev,
//                           scheduleDays: {
//                             ...prev.scheduleDays,
//                             [day]: e.target.checked,
//                           },
//                         }))
//                       }
//                     />
//                     {day}
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <Field label="Start Time">
//               <input
//                 type="time"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.scheduleStart}
//                 onChange={(e) =>
//                   updateRulePreset("scheduleStart", e.target.value)
//                 }
//               />
//             </Field>
//             <Field label="End Time">
//               <input
//                 type="time"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={rulePresets.scheduleEnd}
//                 onChange={(e) =>
//                   updateRulePreset("scheduleEnd", e.target.value)
//                 }
//               />
//             </Field>
//           </div>

//           <h5 className="font-medium text-gray-700 mb-3">Custom Rules</h5>
//           {customRules.map((rule, idx) => (
//             <div key={idx} className="border rounded-lg p-4 mb-3 bg-white">
//               <div className="flex justify-between items-center mb-3">
//                 <span className="font-medium text-sm">
//                   Custom Rule #{idx + 1}
//                 </span>
//                 <button
//                   type="button"
//                   onClick={() => removeCustomRule(idx)}
//                   className="text-red-600 text-sm hover:underline"
//                 >
//                   Remove
//                 </button>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                 <Field label="Rule Type">
//                   <select
//                     className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                     value={rule.rule_type}
//                     onChange={(e) =>
//                       setCustomRules((prev) =>
//                         prev.map((r, i) =>
//                           i === idx ? { ...r, rule_type: e.target.value } : r,
//                         ),
//                       )
//                     }
//                   >
//                     {[
//                       "user_type",
//                       "device_type",
//                       "city",
//                       "cab_partner",
//                       "cart_value",
//                       "ride_count",
//                       "is_new_user",
//                       "current_time",
//                       "customerId",
//                     ].map((t) => (
//                       <option key={t} value={t}>
//                         {t}
//                       </option>
//                     ))}
//                   </select>
//                 </Field>
//                 <Field label="Operator">
//                   <select
//                     className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                     value={rule.operator}
//                     onChange={(e) =>
//                       setCustomRules((prev) =>
//                         prev.map((r, i) =>
//                           i === idx ? { ...r, operator: e.target.value } : r,
//                         ),
//                       )
//                     }
//                   >
//                     {[
//                       "=",
//                       "!=",
//                       ">",
//                       ">=",
//                       "<",
//                       "<=",
//                       "IN",
//                       "NOT_IN",
//                       "SCHEDULE",
//                     ].map((op) => (
//                       <option key={op} value={op}>
//                         {op}
//                       </option>
//                     ))}
//                   </select>
//                 </Field>
//                 <Field label="Value (valid JSON)">
//                   <input
//                     className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                     value={rule.value}
//                     onChange={(e) =>
//                       setCustomRules((prev) =>
//                         prev.map((r, i) =>
//                           i === idx ? { ...r, value: e.target.value } : r,
//                         ),
//                       )
//                     }
//                     placeholder='e.g. "loggedin"'
//                   />
//                 </Field>
//               </div>
//             </div>
//           ))}
//           <button
//             type="button"
//             onClick={addCustomRule}
//             className="px-4 py-2 border border-orange-400 text-orange-600 rounded-lg text-sm hover:bg-orange-50"
//           >
//             + Add Custom Rule
//           </button>
//         </div>
//       )}

//       {createStep === 2 && (
//         <div className="bg-gray-50 p-6 rounded-xl border">
//           <h4 className="text-lg font-semibold mb-1">
//             Step 3 — Budget & Usage Limits{" "}
//             <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-1">
//               Optional
//             </span>
//           </h4>
//           <p className="text-gray-500 text-sm mb-5">
//             Control how many times the offer can be used. Saved to{" "}
//             <strong>offer_limits</strong>.
//           </p>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field label="Total Budget (₹)">
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={limitsForm.total_budget}
//                 onChange={(e) =>
//                   updateLimitsField("total_budget", e.target.value)
//                 }
//               />
//             </Field>
//             <Field label="Total Usage Limit">
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={limitsForm.total_usage_limit}
//                 onChange={(e) =>
//                   updateLimitsField("total_usage_limit", e.target.value)
//                 }
//               />
//             </Field>
//             <Field label="Per User Limit">
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={limitsForm.per_user_limit}
//                 onChange={(e) =>
//                   updateLimitsField("per_user_limit", e.target.value)
//                 }
//               />
//             </Field>
//             <Field label="Per Day Limit">
//               <input
//                 type="number"
//                 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
//                 value={limitsForm.per_day_limit}
//                 onChange={(e) =>
//                   updateLimitsField("per_day_limit", e.target.value)
//                 }
//               />
//             </Field>
//           </div>
//         </div>
//       )}

//       {createStep === 3 && (
//         <div className="bg-gray-50 p-6 rounded-xl border">
//           {/* <h4 className="text-lg font-semibold mb-1">Step 4 — Review & Create</h4> */}
//           <h4 className="text-lg font-semibold mb-1">
//             Step 4 — Review & {isEditMode ? "Update" : "Create"}
//           </h4>
//           <p className="text-gray-500 text-sm mb-5">
//             Review your configuration, then click Create Offer to submit all
//             records.
//           </p>

//           <ReviewSection title="Main Offer" rows={reviewRows} />
//           {reviewRules.length > 0 && (
//             <div className="mt-4 p-4 bg-white rounded-lg border">
//               <h5 className="font-medium mb-2">Rules ({reviewRules.length})</h5>
//               {reviewRules.map((rule: OfferRule, idx) => (
//                 <div
//                   key={idx}
//                   className="flex justify-between text-sm py-1 border-b last:border-0"
//                 >
//                   <span className="text-gray-600">
//                     {rule.rule_type} {rule.operator}
//                   </span>
//                   <span className="text-gray-800 truncate max-w-[50%]">
//                     {rule.value}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//           {reviewHasLimits && (
//             <div className="mt-4 p-4 bg-white rounded-lg border">
//               <h5 className="font-medium mb-2">Limits</h5>
//               {limitsForm.total_budget && (
//                 <ReviewRow
//                   label="Total Budget"
//                   val={`₹${limitsForm.total_budget}`}
//                 />
//               )}
//               {limitsForm.total_usage_limit && (
//                 <ReviewRow
//                   label="Total Usage"
//                   val={limitsForm.total_usage_limit}
//                 />
//               )}
//               {limitsForm.per_user_limit && (
//                 <ReviewRow label="Per User" val={limitsForm.per_user_limit} />
//               )}
//               {limitsForm.per_day_limit && (
//                 <ReviewRow label="Per Day" val={limitsForm.per_day_limit} />
//               )}
//             </div>
//           )}

//           {createResults.length > 0 && (
//             <div className="mt-4 space-y-2">
//               {createResults.map((r, idx) => (
//                 <div
//                   key={idx}
//                   className={`p-3 rounded-lg text-sm ${
//                     r.status === "success"
//                       ? "bg-green-50 text-green-700 border border-green-200"
//                       : "bg-red-50 text-red-700 border border-red-200"
//                   }`}
//                 >
//                   <strong>{r.table}</strong> — {r.message}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       <div className="flex justify-between mt-6">
//         <button
//           type="button"
//           onClick={prevStep}
//           disabled={createStep === 0}
//           className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-40"
//         >
//           ← Previous
//         </button>
//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={onReset}
//             className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//           >
//             Reset
//           </button>
//           <button
//             type="button"
//             onClick={createStep < 3 ? nextStep : submitOffer}
//             disabled={creating}
//             className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-60"
//           >
//             {/* {creating
//               ? "Creating..."
//               : createStep < 3
//                 ? "Next →"
//                 : "Create Offer"} */}
//             {creating
//               ? isEditMode
//                 ? "Updating..."
//                 : "Creating..."
//               : createStep < 3
//                 ? "Next →"
//                 : isEditMode
//                   ? "Update Offer"
//                   : "Create Offer"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function Field({
//   label,
//   required,
//   children,
// }: {
//   label: string;
//   required?: boolean;
//   children: React.ReactNode;
// }) {
//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-700 mb-1">
//         {label}
//         {required && <span className="text-red-500 ml-0.5">*</span>}
//       </label>
//       {children}
//     </div>
//   );
// }

// function ReviewSection({
//   title,
//   rows,
// }: {
//   title: string;
//   rows: { key: string; val: string }[];
// }) {
//   return (
//     <div className="p-4 bg-white rounded-lg border">
//       <h5 className="font-medium mb-2">{title}</h5>
//       {rows.map((row) => (
//         <ReviewRow key={row.key} label={row.key} val={row.val || "—"} />
//       ))}
//     </div>
//   );
// }

// function ReviewRow({ label, val }: { label: string; val: string }) {
//   return (
//     <div className="flex justify-between text-sm py-1 border-b last:border-0">
//       <span className="text-gray-600">{label}</span>
//       <span className="text-gray-800 truncate max-w-[60%]">{val}</span>
//     </div>
//   );
// }


import { useState } from "react";
import {
  WIZARD_STEPS,
  WEEK_DAYS,
  OfferForm,
  RulePresets,
  LimitsForm,
  CustomRule,
  CreateResult,
  OfferRule,
  buildRules,
  hasLimits,
  buildOfferPayload,
  buildReviewRows,
  buildLimitsPayload,
} from "../../utils/aioOfferHelpers";
import {
  CUSTOM_GENERIC_CREATE,
  CUSTOM_GENERIC_UPDATE,
  CUSTOM_GENERIC_DELETE,
} from "../../config/customerCare/operationsApicall";

interface CreateOfferWizardProps {
  partner: string;
  offerForm: OfferForm;
  setOfferForm: React.Dispatch<React.SetStateAction<OfferForm>>;
  rulePresets: RulePresets;
  setRulePresets: React.Dispatch<React.SetStateAction<RulePresets>>;
  limitsForm: LimitsForm;
  setLimitsForm: React.Dispatch<React.SetStateAction<LimitsForm>>;
  customRules: CustomRule[];
  setCustomRules: React.Dispatch<React.SetStateAction<CustomRule[]>>;
  onReset: () => void;
  isEditMode: boolean;
  editingOfferId: string | null;
  onUpdateSuccess: () => void;
  offerRuleIds: Record<string, number[]>;
  offerLimitId: number | null;
}

export function CreateOfferWizard({
  partner,
  offerForm,
  setOfferForm,
  rulePresets,
  setRulePresets,
  limitsForm,
  setLimitsForm,
  customRules,
  setCustomRules,
  onReset,
  isEditMode,
  editingOfferId,
  offerRuleIds,
  offerLimitId,
  onUpdateSuccess,
}: CreateOfferWizardProps) {
  const [createStep, setCreateStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createResults, setCreateResults] = useState<CreateResult[]>([]);

  const reviewRules = buildRules(
    offerForm.offer_id,
    rulePresets,
    customRules,
    offerForm.min_cart_value,
  );
  const reviewRows = buildReviewRows(offerForm);
  const reviewHasLimits = hasLimits(limitsForm);

  const goToStep = (idx: number) => {
    if (idx >= 0 && idx < WIZARD_STEPS.length) setCreateStep(idx);
  };

  const validateStep0 = () => {
    if (!offerForm.offer_id) {
      alert("Offer ID is required");
      return false;
    }
    if (!offerForm.name) {
      alert("Internal name is required");
      return false;
    }
    if (!offerForm.title) {
      alert("Display title is required");
      return false;
    }
    if (!offerForm.discount_value) {
      alert("Discount value is required");
      return false;
    }
  if (!offerForm.start_time_local) {
    alert("Start Time is required");
    return false;
  }

  if (!offerForm.end_time_local) {
    alert("End Time is required");
    return false;
  }
    if (!offerForm.tnc || offerForm.tnc.trim() === "") {
      alert("Terms & Conditions are required");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (createStep === 0 && !validateStep0()) return;
    if (createStep < WIZARD_STEPS.length - 1) setCreateStep(createStep + 1);
  };

  const prevStep = () => {
    if (createStep > 0) setCreateStep(createStep - 1);
  };

  const addCustomRule = () => {
    setCustomRules((prev) => [
      ...prev,
      { rule_type: "user_type", operator: "=", value: "" },
    ]);
  };

  const removeCustomRule = (idx: number) => {
    setCustomRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const createWithResult = async (
    table: string,
    data: Record<string, string>,
    label?: string,
  ): Promise<CreateResult> => {
    try {
      const res = await CUSTOM_GENERIC_CREATE(partner, { table, data });
      return {
        table,
        status: "success",
        message: `${label || table} — ${res?.message || "OK"}`,
      };
    } catch (err: any) {
      return {
        table,
        status: "error",
        message: `${label || table} — ${err?.response?.data?.message || "Failed"}`,
      };
    }
  };

  const submitOffer = async () => {
    if (!offerForm.offer_id) {
      alert("Offer ID is required");
      setCreateStep(0);
      return;
    }

    setCreating(true);
    setCreateResults([]);
    const results: CreateResult[] = [];

    if (isEditMode) {
      // UPDATE Flow (Fix applied here)
      try {
        const res = await CUSTOM_GENERIC_UPDATE(partner, {
          table: "offers",
          id: editingOfferId,
          data: buildOfferPayload(offerForm, true),
        });
        //  console.log("Update response:", res);
        results.push({
          table: "offers",
          status: "success",
          message: `Updated — ${res?.message || "OK"}`,
        });

        const rules = buildRules(
          offerForm.offer_id,
          rulePresets,
          customRules,
          offerForm.min_cart_value,
        );

        for (const rule of rules) {
          const ruleKey = `${rule.rule_type}|${rule.operator}`;
          const ruleIds = offerRuleIds[ruleKey] || [];

          if (ruleIds.length > 0) {
            for (const ruleId of ruleIds) {
              await CUSTOM_GENERIC_UPDATE(partner, {
                table: "offer_rules",
                id: ruleId,
                data: rule,
              });
            }
            results.push({
              table: "offer_rules",
              status: "success",
              message: `Updated Rule — ${rule.rule_type}`,
            });
          } else {
            const newRuleResult = await createWithResult(
              "offer_rules",
              rule as unknown as Record<string, string>,
              `${rule.rule_type} ${rule.operator}`,
            );
            results.push(newRuleResult);
          }
        }
          const newRuleKeys = new Set(
          rules.map((r) => `${r.rule_type}|${r.operator}`),
        );

        for (const ruleKey of Object.keys(offerRuleIds)) {
          if (!newRuleKeys.has(ruleKey)) {
            const staleIds = offerRuleIds[ruleKey] || [];
            for (const staleId of staleIds) {
              try {
                await CUSTOM_GENERIC_DELETE(partner, {
                  table: "offer_rules",
                  id: staleId,
                });
                results.push({
                  table: "offer_rules",
                  status: "success",
                  message: `Removed Rule — ${ruleKey}`,
                });
              } catch (err: any) {
                results.push({
                  table: "offer_rules",
                  status: "error",
                  message: `Failed to remove rule ${ruleKey}`,
                });
              }
            }
          }
        }

        

        if (offerLimitId) {
          await CUSTOM_GENERIC_UPDATE(partner, {
            table: "offer_limits",
            id: offerLimitId,
            data: buildLimitsPayload(offerForm.offer_id, limitsForm),
          });
          results.push({
            table: "offer_limits",
            status: "success",
            message: `Updated Limits`,
          });
        } else if (hasLimits(limitsForm)) {
          const limitResult = await createWithResult(
            "offer_limits",
            buildLimitsPayload(offerForm.offer_id, limitsForm),
            "Limits",
          );
          results.push(limitResult);
        }
      } catch (err: any) {
        results.push({
          table: "offers",
          status: "error",
          message: err?.response?.data?.message || "Update failed",
        });
      }
    } else {
      // CREATE Flow
      const offerResult = await createWithResult(
        "offers",
        buildOfferPayload(offerForm, true),
        "Main offer",
      );
      results.push(offerResult);

      const rules = buildRules(
        offerForm.offer_id,
        rulePresets,
        customRules,
        offerForm.min_cart_value,
      );
      for (const rule of rules) {
        const r = await createWithResult(
          "offer_rules",
          rule as unknown as Record<string, string>,
          `${rule.rule_type} ${rule.operator}`,
        );
        results.push(r);
      }

      if (hasLimits(limitsForm)) {
        const limitResult = await createWithResult(
          "offer_limits",
          buildLimitsPayload(offerForm.offer_id, limitsForm),
          "Limits",
        );
        results.push(limitResult);
      }
    }

    setCreateResults(results);
    setCreating(false);
    setTimeout(() => onUpdateSuccess(), 0);
  };

  const updateOfferField = (key: keyof OfferForm, value: string) => {
    setOfferForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateRulePreset = (key: keyof RulePresets, value: string) => {
    setRulePresets((prev) => ({ ...prev, [key]: value }));
  };

  const updateLimitsField = (key: keyof LimitsForm, value: string) => {
    setLimitsForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b pb-4 flex-wrap">
        {WIZARD_STEPS.map((step, idx) => (
          <button
            key={step}
            type="button"
            onClick={() => goToStep(idx)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              createStep === idx
                ? "bg-orange-500 text-white shadow"
                : idx < createStep
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {idx + 1}. {step}
          </button>
        ))}
      </div>

      {createStep === 0 && (
        <div className="bg-gray-50 p-6 rounded-xl border">
          <h4 className="text-lg font-semibold mb-1">
            Step 1 — Main Offer Details
          </h4>
          <p className="text-gray-500 text-sm mb-5">
            Configure the core offer. This creates a record in the{" "}
            <strong>offers</strong> table.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Offer ID" required>
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.offer_id}
                onChange={(e) => updateOfferField("offer_id", e.target.value)}
                placeholder="e.g. MEGA150"
              />
              <span className="text-xs text-gray-400">
                Unique identifier — no spaces
              </span>
            </Field>
            <Field label="Internal Name" required>
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.name}
                onChange={(e) => updateOfferField("name", e.target.value)}
                placeholder="e.g. Mega Weekend Offer"
              />
            </Field>
            <Field label="Display Title" required>
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.title}
                onChange={(e) => updateOfferField("title", e.target.value)}
                placeholder="e.g. Flat ₹150 OFF"
              />
            </Field>
            <Field label="Display Subtitle">
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.subtitle}
                onChange={(e) => updateOfferField("subtitle", e.target.value)}
              />
            </Field>
            <Field label="Discount Type" required>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.type}
                onChange={(e) =>
                  updateOfferField("type", e.target.value as OfferForm["type"])
                }
              >
                <option value="flat">Flat (₹ amount off)</option>
                <option value="percentage">Percentage (% off)</option>
              </select>
            </Field>
            <Field
              label={
                offerForm.type === "percentage"
                  ? "Discount %"
                  : "Discount Amount (₹)"
              }
              required
            >
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.discount_value}
                onChange={(e) =>
                  updateOfferField("discount_value", e.target.value)
                }
              />
            </Field>
            {offerForm.type === "percentage" && (
              <Field label="Max Discount Cap (₹)">
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                  value={offerForm.max_discount}
                  onChange={(e) =>
                    updateOfferField("max_discount", e.target.value)
                  }
                />
              </Field>
            )}
            <Field label="Minimum Cart Value (₹)">
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.min_cart_value}
                onChange={(e) =>
                  updateOfferField("min_cart_value", e.target.value)
                }
              />
            </Field>
            <Field label="Priority">
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.priority}
                onChange={(e) => updateOfferField("priority", e.target.value)}
              />
            </Field>
            {/* <Field label="Stackable">
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.is_stackable}
                onChange={(e) =>
                  updateOfferField("is_stackable", e.target.value)
                }
              >
                <option value="0">No — Non-stackable</option>
                <option value="1">Yes — Stackable</option>
              </select>
            </Field> */}
            <Field label="Status">
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.status}
                onChange={(e) => updateOfferField("status", e.target.value)}
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </Field>
            <Field label="Client ID">
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                // value={offerForm.client_id}
                // onChange={(e) => updateOfferField("client_id", e.target.value)}
                value="ING"
                disabled
              />
            </Field>
            <Field label="User Visibility">
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.userVisibility}
                onChange={(e) =>
                  updateOfferField("userVisibility", e.target.value)
                }
              >
                <option value="1">Visible to users</option>
                <option value="0">Hidden</option>
              </select>
            </Field>
            <Field label="Start Time" required>
              <input
                type="datetime-local"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.start_time_local}
                onChange={(e) =>
                  updateOfferField("start_time_local", e.target.value)
                }
              />
            </Field>
            <Field label="End Time" required>
              <input
                type="datetime-local"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={offerForm.end_time_local}
                onChange={(e) =>
                  updateOfferField("end_time_local", e.target.value)
                }
              />
            </Field>
            <div className="md:col-span-2 lg:col-span-3">
              <Field label="Description">
                <input
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                  value={offerForm.description}
                  onChange={(e) =>
                    updateOfferField("description", e.target.value)
                  }
                />
              </Field>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Field label="Terms & Conditions" required>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm min-h-[80px]"
                  value={offerForm.tnc}
                  onChange={(e) => updateOfferField("tnc", e.target.value)}
                  placeholder="e.g. Applicable once per user."
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {createStep === 1 && (
        <div className="bg-gray-50 p-6 rounded-xl border">
          <h4 className="text-lg font-semibold mb-1">
            Step 2 — Targeting Rules{" "}
            {/* <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-1">
              Optional
            </span> */}
          </h4>
          <p className="text-gray-500 text-sm mb-5">
            Define who can use this offer. Each rule is saved to{" "}
            <strong>offer_rules</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Field label="User Type">
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.user_type}
                onChange={(e) => updateRulePreset("user_type", e.target.value)}
              >
                <option value="">Any user</option>
                <option value="loggedin">Logged-in users only</option>
                <option value="guest">Guest users only</option>
              </select>
            </Field>
            <Field label="Device Type">
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.device_type}
                onChange={(e) =>
                  updateRulePreset("device_type", e.target.value)
                }
              >
                <option value="">Any device</option>
                <option value="android">Android only</option>
                <option value="ios">iOS only</option>
                <option value="web">Web only</option>
              </select>
            </Field>
            <Field label="Cab Partner">
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.cab_partner}
                onChange={(e) =>
                  updateRulePreset("cab_partner", e.target.value)
                }
                placeholder="e.g. BLUSMART"
              />
            </Field>
            <Field label="Cities (comma-separated)">
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.cities}
                onChange={(e) => updateRulePreset("cities", e.target.value)}
                placeholder="e.g. DELHI, MUMBAI, BLR"
              />
            </Field>
            <Field label="Exclude Cities">
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.exclude_cities}
                onChange={(e) =>
                  updateRulePreset("exclude_cities", e.target.value)
                }
              />
            </Field>
            <Field label="New User Only">
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.is_new_user}
                onChange={(e) =>
                  updateRulePreset("is_new_user", e.target.value)
                }
              >
                <option value="">No restriction</option>
                <option value="true">New users only</option>
              </select>
            </Field>
            <Field label="Max Ride Count (less than)">
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.ride_count}
                onChange={(e) => updateRulePreset("ride_count", e.target.value)}
              />
            </Field>
            <Field label="Customer IDs (comma-separated)">
              <input
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.customer_ids}
                onChange={(e) =>
                  updateRulePreset("customer_ids", e.target.value)
                }
              />
            </Field>
          </div>

          <h5 className="font-medium text-gray-700 mb-3">
            Schedule (Weekend / Time-based)
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Days
              </label>
              <div className="flex flex-wrap gap-3">
                {WEEK_DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={rulePresets.scheduleDays[day] || false}
                      onChange={(e) =>
                        setRulePresets((prev) => ({
                          ...prev,
                          scheduleDays: {
                            ...prev.scheduleDays,
                            [day]: e.target.checked,
                          },
                        }))
                      }
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Start Time">
              <input
                type="time"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.scheduleStart}
                onChange={(e) =>
                  updateRulePreset("scheduleStart", e.target.value)
                }
              />
            </Field>
            <Field label="End Time">
              <input
                type="time"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={rulePresets.scheduleEnd}
                onChange={(e) =>
                  updateRulePreset("scheduleEnd", e.target.value)
                }
              />
            </Field>
          </div>

          <h5 className="font-medium text-gray-700 mb-3">Custom Rules</h5>
          {customRules.map((rule, idx) => (
            <div key={idx} className="border rounded-lg p-4 mb-3 bg-white">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-sm">
                  Custom Rule #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCustomRule(idx)}
                  className="text-red-600 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Rule Type">
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                    value={rule.rule_type}
                    onChange={(e) =>
                      setCustomRules((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, rule_type: e.target.value } : r,
                        ),
                      )
                    }
                  >
                    {[
                      "user_type",
                      "device_type",
                      "city",
                      "cab_partner",
                      "cart_value",
                      "ride_count",
                      "is_new_user",
                      "current_time",
                      "customerId",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Operator">
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                    value={rule.operator}
                    onChange={(e) =>
                      setCustomRules((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, operator: e.target.value } : r,
                        ),
                      )
                    }
                  >
                    {[
                      "=",
                      "!=",
                      ">",
                      ">=",
                      "<",
                      "<=",
                      "IN",
                      "NOT_IN",
                      "SCHEDULE",
                    ].map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Value (valid JSON)">
                  <input
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                    value={rule.value}
                    onChange={(e) =>
                      setCustomRules((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, value: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder='e.g. "loggedin"'
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCustomRule}
            className="px-4 py-2 border border-orange-400 text-orange-600 rounded-lg text-sm hover:bg-orange-50"
          >
            + Add Custom Rule
          </button>
        </div>
      )}

      {createStep === 2 && (
        <div className="bg-gray-50 p-6 rounded-xl border">
          <h4 className="text-lg font-semibold mb-1">
            Step 3 — Budget & Usage Limits{" "}
            {/* <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-1">
              Optional
            </span> */}
          </h4>
          <p className="text-gray-500 text-sm mb-5">
            Control how many times the offer can be used. Saved to{" "}
            <strong>offer_limits</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Total Budget (₹)" required>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={limitsForm.total_budget}
                onChange={(e) =>
                  updateLimitsField("total_budget", e.target.value)
                }
              />
            </Field>
            <Field label="Total Usage Limit" required>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={limitsForm.total_usage_limit}
                onChange={(e) =>
                  updateLimitsField("total_usage_limit", e.target.value)
                }
              />
            </Field>
            <Field label="Per User Limit">
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={limitsForm.per_user_limit}
                onChange={(e) =>
                  updateLimitsField("per_user_limit", e.target.value)
                }
              />
            </Field>
            <Field label="Per Day Limit">
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                value={limitsForm.per_day_limit}
                onChange={(e) =>
                  updateLimitsField("per_day_limit", e.target.value)
                }
              />
            </Field>
          </div>
        </div>
      )}

      {createStep === 3 && (
        <div className="bg-gray-50 p-6 rounded-xl border">
          <h4 className="text-lg font-semibold mb-1">
            Step 4 — Review & {isEditMode ? "Update" : "Create"}
          </h4>
          <p className="text-gray-500 text-sm mb-5">
            Review your configuration, then click {isEditMode ? "Update Offer" : "Create Offer"} to submit all records.
          </p>

          <ReviewSection title="Main Offer" rows={reviewRows} />
          {reviewRules.length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <h5 className="font-medium mb-2">Rules ({reviewRules.length})</h5>
              {reviewRules.map((rule: OfferRule, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-sm py-1 border-b last:border-0"
                >
                  <span className="text-gray-600">
                    {rule.rule_type} {rule.operator}
                  </span>
                  <span className="text-gray-800 truncate max-w-[50%]">
                    {rule.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          {reviewHasLimits && (
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <h5 className="font-medium mb-2">Limits</h5>
              {limitsForm.total_budget && (
                <ReviewRow
                  label="Total Budget"
                  val={`₹${limitsForm.total_budget}`}
                />
              )}
              {limitsForm.total_usage_limit && (
                <ReviewRow
                  label="Total Usage"
                  val={limitsForm.total_usage_limit}
                />
              )}
              {limitsForm.per_user_limit && (
                <ReviewRow label="Per User" val={limitsForm.per_user_limit} />
              )}
              {limitsForm.per_day_limit && (
                <ReviewRow label="Per Day" val={limitsForm.per_day_limit} />
              )}
            </div>
          )}

          {createResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {createResults.map((r, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-sm ${
                    r.status === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <strong>{r.table}</strong> — {r.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={createStep === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-40"
        >
          ← Previous
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={createStep < 3 ? nextStep : submitOffer}
            disabled={creating}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-60"
          >
            {creating
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : createStep < 3
                ? "Next →"
                : isEditMode
                  ? "Update Offer"
                  : "Create Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewSection({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; val: string }[];
}) {
  return (
    <div className="p-4 bg-white rounded-lg border">
      <h5 className="font-medium mb-2">{title}</h5>
      {rows.map((row) => (
        <ReviewRow key={row.key} label={row.key} val={row.val || "—"} />
      ))}
    </div>
  );
}

function ReviewRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-800 truncate max-w-[60%]">{val}</span>
    </div>
  );
}