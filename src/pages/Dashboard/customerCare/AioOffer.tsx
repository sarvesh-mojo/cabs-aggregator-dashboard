import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import PageMeta from "../../../components/common/PageMeta";
// import { PartnerTab } from "../../../components/common/PartnerTab";
import { CreateOfferWizard } from "../../../components/offers/CreateOfferWizard";
import { BrowseOfferTables } from "../../../components/offers/BrowseOfferTables";
import { OfferDocumentation } from "../../../components/offers/OfferDocumentation";
import { CUSTOM_GENERIC_TABLE } from "../../../config/customerCare/operationsApicall";
import {
  defaultOfferForm,
  defaultRulePresets,
  defaultLimitsForm,
  getClientIdForPartner,
  WEEK_DAYS,
  OfferForm,
  RulePresets,
  LimitsForm,
  CustomRule,
} from "../../../utils/aioOfferHelpers";

type ViewMode = "create" | "browse";

const AioOffer = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const [selectedPartner, setSelectedPartner] = useState<string>(
    OperationstoreData?.ReportSelectedPartner,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("create");
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  // const refreshBrowseRef = useRef<(() => void) | null>(null);
  // const [browseKey, setBrowseKey] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const clientId = getClientIdForPartner(selectedPartner);
  const [offerForm, setOfferForm] = useState<OfferForm>(() =>
    defaultOfferForm(clientId),
  );
  const [rulePresets, setRulePresets] =
    useState<RulePresets>(defaultRulePresets);
  const [limitsForm, setLimitsForm] = useState<LimitsForm>(defaultLimitsForm);
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [offerRuleIds, setOfferRuleIds] = useState<Record<string, number[]>>({});
  const [offerLimitId, setOfferLimitId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedPartner(OperationstoreData?.ReportSelectedPartner);
  }, [OperationstoreData?.ReportSelectedPartner]);

  useEffect(() => {
    const newClientId = getClientIdForPartner(selectedPartner);
    setOfferForm((prev) => ({ ...prev, client_id: newClientId }));
  }, [selectedPartner]);

  const resetCreateForm = () => {
    setOfferForm(defaultOfferForm(getClientIdForPartner(selectedPartner)));
    setRulePresets(defaultRulePresets());
    setLimitsForm(defaultLimitsForm());
    setCustomRules([]);
    setEditingOfferId(null);
  };
  const handleEditOffer = async (row: any) => {
    setOfferForm({
      offer_id: row.offer_id || "",
      name: row.name || "",
      title: row.title || "",
      subtitle: row.subtitle || "",
      description: row.description || "",
      type: row.type || "flat",
      discount_value: String(row.discount_value || ""),
      max_discount: String(row.max_discount || ""),
      min_cart_value: String(row.min_cart_value || ""),
      priority: String(row.priority || "10"),
      is_stackable: String(row.is_stackable || "0"),
      status: row.status || "active",
      client_id: row.client_id || clientId,
      userVisibility: String(row.userVisibility || "1"),
      tnc: row.tnc || "",
      start_time_local: row.start_time
        ? row.start_time.replace(" ", "T").slice(0, 16)
        : "",
      end_time_local: row.end_time
        ? row.end_time.replace(" ", "T").slice(0, 16)
        : "",
    });
    setEditingOfferId(row.id ?? row._id ?? null);
    setViewMode("create");
    // console.log("Row data from table:", row);
    // console.log("discount_value:", row.discount_value)
    setRulePresets(defaultRulePresets());
    setCustomRules([]);
    setLimitsForm(defaultLimitsForm());
    const offerId = row.offer_id;
    if (!offerId || !selectedPartner) return;

    // 3. Fetch offer_rules + offer_limits in background — same pattern
    //    as the offer edit, no blocking UI.
    try {
      const [rulesRes, limitsRes] = await Promise.all([
        CUSTOM_GENERIC_TABLE(selectedPartner, {
          table: "offer_rules",
          filters: { offer_id: offerId },
          page: 1,
          limit: 100,
        }).catch(() => null),
        CUSTOM_GENERIC_TABLE(selectedPartner, {
          table: "offer_limits",
          filters: { offer_id: offerId },
          page: 1,
          limit: 1,
        }).catch(() => null),
      ]);

      // console.log("rulesRes:", rulesRes);
      // console.log("limitsRes:", limitsRes);

      const rules =
        rulesRes && rulesRes.code === 200 && Array.isArray(rulesRes.data)
          ? rulesRes.data
          : [];
      const limitsRow =
        limitsRes && limitsRes.code === 200 && Array.isArray(limitsRes.data)
          ? limitsRes.data[0]
          : null;

      // console.log("RULES =>", rules);
      // console.log("LIMITS =>", limitsRow);

      const ids: Record<string, number[]> = {};

      rules.forEach((r: any) => {
        const key = `${r.rule_type}|${r.operator}`;
        ids[key] = ids[key] ? [...ids[key], r.id] : [r.id];
      });

      setOfferRuleIds(ids);
      setOfferLimitId(limitsRow?.id ?? null);

      //   console.log("Parsed rules array:", rules);
      //  console.log("Parsed limitsRow:", limitsRow);

      if (rules.length > 0) {
        applyFetchedRules(rules);
      }
      if (limitsRow) {
        setLimitsForm({
          total_budget:
            limitsRow.total_budget !== null &&
            limitsRow.total_budget !== undefined
              ? String(limitsRow.total_budget)
              : "",
          total_usage_limit:
            limitsRow.total_usage_limit !== null &&
            limitsRow.total_usage_limit !== undefined
              ? String(limitsRow.total_usage_limit)
              : "",
          per_user_limit:
            limitsRow.per_user_limit !== null &&
            limitsRow.per_user_limit !== undefined
              ? String(limitsRow.per_user_limit)
              : "1",
          per_day_limit:
            limitsRow.per_day_limit !== null &&
            limitsRow.per_day_limit !== undefined
              ? String(limitsRow.per_day_limit)
              : "",
        });
      }
    } catch (err) {
      // Non-blocking — offer details are already editable even if this fails
      console.error("Failed to load rules/limits for edit:", err);
    }
  };

  const handleEditRule = async (row: any) => {
    try {
      const res = await CUSTOM_GENERIC_TABLE(selectedPartner, {
        table: "offers",
        filters: {
          offer_id: row.offer_id,
        },
        page: 1,
        limit: 1,
      });

      if (res?.code === 200 && res.data?.length) {
        handleEditOffer(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to load offer from rule:", err);
    }
  };

  const handleEditLimit = async (row: any) => {
    try {
      const res = await CUSTOM_GENERIC_TABLE(selectedPartner, {
        table: "offers",
        filters: {
          offer_id: row.offer_id,
        },
        page: 1,
        limit: 1,
      });

      if (res?.code === 200 && res.data?.length) {
        handleEditOffer(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to load offer from limit:", err);
    }
  };

  /**
   * Safely parses a rule's `value` column (may be JSON string, plain string,
   * or already-malformed text from manual DB edits) and maps known rule_types
   * back into rulePresets / schedule fields. Anything unrecognized is pushed
   * into customRules so no data is silently lost.
   */
  const applyFetchedRules = (rules: any[]) => {
    const newPresets = defaultRulePresets();
    const leftoverCustomRules: CustomRule[] = [];
    const cityIncludeList: string[] = [];
    const cityExcludeList: string[] = [];

    const safeParse = (val: string) => {
      if (val === null || val === undefined) return val;
      try {
        return JSON.parse(val);
      } catch {
        return val; // plain string, leave as-is
      }
    };

    rules.forEach((r: any) => {
      const ruleType = r.rule_type;
      const operator = r.operator;
      const rawValue = r.value;
      const value = safeParse(rawValue);

      try {
        switch (ruleType) {
          case "user_type":
            if (typeof value === "string") newPresets.user_type = value;
            break;

          case "device_type":
            if (typeof value === "string") newPresets.device_type = value;
            break;

          case "cab_partner":
            if (typeof value === "string") newPresets.cab_partner = value;
            break;

          case "city":
            if (operator === "IN" && Array.isArray(value)) {
              cityIncludeList.push(...value.map(String));
            } else if (operator === "NOT_IN" && Array.isArray(value)) {
              cityExcludeList.push(...value.map(String));
            } else {
              leftoverCustomRules.push({
                rule_type: ruleType,
                operator,
                value: rawValue,
              });
            }
            break;

          case "is_new_user":
            newPresets.is_new_user =
              value === true || value === "true" ? "true" : "";
            break;

          case "ride_count":
            if (operator === "<") {
              newPresets.ride_count = String(value);
            } else {
              leftoverCustomRules.push({
                rule_type: ruleType,
                operator,
                value: rawValue,
              });
            }
            break;

          case "customerId":
            if (operator === "IN" && Array.isArray(value)) {
              newPresets.customer_ids = value.map(String).join(", ");
            } else {
              leftoverCustomRules.push({
                rule_type: ruleType,
                operator,
                value: rawValue,
              });
            }
            break;

          case "cart_value":
            // This is derived from offerForm.min_cart_value on create,
            // so we don't duplicate it into rulePresets here.
            break;

          case "current_time":
            if (
              operator === "SCHEDULE" &&
              value &&
              typeof value === "object" &&
              Array.isArray(value.days)
            ) {
              const dayMap: Record<string, boolean> = {};
              WEEK_DAYS.forEach((d: string) => {
                dayMap[d] = value.days.includes(d);
              });
              newPresets.scheduleDays = dayMap;
              newPresets.scheduleStart = value.startTime || "";
              newPresets.scheduleEnd = value.endTime || "";
            } else {
              leftoverCustomRules.push({
                rule_type: ruleType,
                operator,
                value: rawValue,
              });
            }
            break;

          default:
            leftoverCustomRules.push({
              rule_type: ruleType,
              operator,
              value: rawValue,
            });
        }
      } catch {
        // If anything about this specific rule is malformed, don't crash
        // the whole edit flow — just drop it into custom rules as raw text.
        leftoverCustomRules.push({
          rule_type: ruleType,
          operator,
          value: rawValue,
        });
      }
    });

    newPresets.cities = cityIncludeList.join(", ");
    newPresets.exclude_cities = cityExcludeList.join(", ");

    setRulePresets(newPresets);
    setCustomRules(leftoverCustomRules);
  };

  return (
    <div>
      <PageMeta
        title="AIO Offer Management"
        description="Create and manage offers via the Offer Engine"
      />

      <div className="bg-white p-6 mx-auto max-w-full rounded-xl shadow-lg">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AIO Offer</h2>
            <p className="text-gray-500 text-sm mt-1">
              Offer Engine — create offers easily or browse tables
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDocs((v) => !v)}
            className="px-4 py-2 border border-orange-400 text-orange-600 rounded-lg text-sm hover:bg-orange-50"
          >
            {showDocs ? "Hide" : "Show"} Documentation
          </button>
        </div>

        {/* <PartnerTab /> */}

        {showDocs && <OfferDocumentation />}

        <div className="flex gap-2 mb-6 border-b pb-3">
          <button
            type="button"
            onClick={() => {
              if (editingOfferId) {
                resetCreateForm();
              }
              setViewMode("create");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "create"
                ? "bg-orange-500 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            + Create Offer
          </button>
          <button
            type="button"
            onClick={() => setViewMode("browse")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "browse"
                ? "bg-orange-500 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Browse Tables
          </button>
        </div>

        {viewMode === "create" ? (
          <CreateOfferWizard
            partner={selectedPartner}
            offerForm={offerForm}
            setOfferForm={setOfferForm}
            rulePresets={rulePresets}
            setRulePresets={setRulePresets}
            limitsForm={limitsForm}
            setLimitsForm={setLimitsForm}
            customRules={customRules}
            setCustomRules={setCustomRules}
            onReset={resetCreateForm}
            isEditMode={!!editingOfferId}
            editingOfferId={editingOfferId}
            offerRuleIds={offerRuleIds}
            offerLimitId={offerLimitId}
            onUpdateSuccess={() => {
              // console.log("onUpdateSuccess called");
              setEditingOfferId(null);
              setViewMode("browse");
              setRefreshTrigger((prev) => {
                // console.log("refreshTrigger set to:", prev + 1);
                return prev + 1;
              });
            }}
          />
        ) : (
          <BrowseOfferTables
            partner={selectedPartner}
            // key={browseKey}
            refreshTrigger={refreshTrigger}
            onEditOffer={handleEditOffer}
            // onRegisterRefresh={(fn) => {
            //   refreshBrowseRef.current = fn;
            // }}
            onEditRule={handleEditRule}
            onEditLimit={handleEditLimit}
          />
        )}
      </div>
    </div>
  );
};

export default AioOffer;
