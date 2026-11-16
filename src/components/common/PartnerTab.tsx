import { useDispatch, useSelector } from 'react-redux';
import { SaveReportActivePartner } from '../../Redux/slices/operationSlice';
import { useEffect, useMemo, useState } from 'react';
import {
  getLoginUsername,
  getRestrictedBacPartner,
  getRestrictedBacTabLabel,
  isRestrictedBacOpsUser,
  resolveLockedCabPartners,
  resolveRestrictedBacPartner,
} from '../../utils/partnerAccess';

const BAC_SUB_TABS = ["bac_agent", "bac_mb", "bac_yatra", "bac_corp", "bac_swiggy", "bac_agentic_chat_dev","bac_agentic_chat"];

const BAC_LABELS: Record<string, string> = {
  bac_agent: "Agent",
  bac_mb:    "MB",
  bac_yatra: "Yatra",
  bac_corp:  "Corp",
  bac_swiggy: "Swiggy/Crew",
  bac_agentic_chat_dev: "AGENTIC-CHAT-DEV",
  bac_agentic_chat: "AGENTIC-CHAT",
};


export const PartnerTab = ({ propsData = { isall: true }, rightSlot = null }: any) => {

  const dispatch = useDispatch();
  const AuthstoreData = useSelector((state: any) => state.authStore);
  const OperationstoreData = useSelector((state: any) => state?.operationStore);

  const loginUsername = getLoginUsername(AuthstoreData?.login_username);

  const isRestrictedBacLogin = useMemo(
    () => isRestrictedBacOpsUser(loginUsername),
    [loginUsername],
  );

  const restrictedBacPartner = useMemo(
    () => getRestrictedBacPartner(loginUsername),
    [loginUsername],
  );

  const restrictedBacTabLabel = useMemo(
    () => getRestrictedBacTabLabel(loginUsername),
    [loginUsername],
  );

  const [activeTab, setActiveTab] = useState<string>(
    resolveRestrictedBacPartner(
      OperationstoreData?.ReportSelectedPartner,
      loginUsername,
    ) || OperationstoreData?.ReportSelectedPartner,
  );

   // Track active BAC sub-tab
  const [activeBacSubTab, setActiveBacSubTab] = useState<string>(() => {
    const restricted = getRestrictedBacPartner(loginUsername);
    if (restricted) {
      return restricted;
    }
    const selected = OperationstoreData?.ReportSelectedPartner;
    return selected === "bac" || BAC_SUB_TABS.includes(selected) ? selected : "bac";
  });

  const lockedCabPartners = resolveLockedCabPartners(
    AuthstoreData?.login_partners,
    AuthstoreData?.logsPartner,
  );
  const isLockedCabPartner = (partnerName: string) =>
    lockedCabPartners.some(
      (cabPartner) => cabPartner.toLowerCase() === String(partnerName).toLowerCase(),
    );

   // let displayPartners = AuthstoreData?.login_partners;
   let displayPartners = (AuthstoreData?.login_partners || []).filter(
    (p: string) => !BAC_SUB_TABS.includes(p) && !isLockedCabPartner(p)
  );
  if (!displayPartners.length) {
    displayPartners = ["indigo"];
  }
  if (propsData?.isall === true && displayPartners?.length > 1) {
    // displayPartners = [...AuthstoreData?.login_partners, "all"];
     displayPartners = [...displayPartners, "all"]; 
  }

   const isBacActive =
     activeTab === "bac" || BAC_SUB_TABS.includes(activeTab);

  const isPartnerTabActive = (tab: string) => {
    if (tab === "bac") {
      return activeTab === "bac" || BAC_SUB_TABS.includes(activeTab);
    }
    return activeTab === tab;
  };

  useEffect(() => {
    const selected = OperationstoreData?.ReportSelectedPartner;
    const resolved = resolveRestrictedBacPartner(selected, loginUsername);
    setActiveTab(resolved || selected);

    if (isRestrictedBacLogin && restrictedBacPartner) {
      setActiveBacSubTab(restrictedBacPartner);
      return;
    }

    if (selected === "bac" || BAC_SUB_TABS.includes(selected)) {
      setActiveBacSubTab(selected);
    }
  }, [
    OperationstoreData?.ReportSelectedPartner,
    loginUsername,
    isRestrictedBacLogin,
    restrictedBacPartner,
  ]);

  useEffect(() => {
    const current = OperationstoreData?.ReportSelectedPartner;
    if (!current || !isLockedCabPartner(current)) return;
    const fallback = displayPartners[0] || "indigo";
    dispatch(SaveReportActivePartner(fallback));
    setActiveTab(fallback);
  }, [OperationstoreData?.ReportSelectedPartner, lockedCabPartners.join(",")]);

  useEffect(() => {
    if (!isRestrictedBacLogin || !restrictedBacPartner) return;

    const current = OperationstoreData?.ReportSelectedPartner;
    const resolved = resolveRestrictedBacPartner(current, loginUsername);
    const isBacContext =
      current === "bac" ||
      current?.startsWith("bac_");

    if (isBacContext && resolved !== current) {
      dispatch(SaveReportActivePartner(restrictedBacPartner));
      setActiveTab(restrictedBacPartner);
      setActiveBacSubTab(restrictedBacPartner);
    }
  }, [
    dispatch,
    isRestrictedBacLogin,
    restrictedBacPartner,
    loginUsername,
    OperationstoreData?.ReportSelectedPartner,
  ]);

  const onChangeBacSubTab = (tab: string) => {
    setActiveBacSubTab(tab);
    dispatch(SaveReportActivePartner(tab));
    setActiveTab(tab);
  };

  const onChangeTab = (tab: string) => {
    if (tab === "bac" && isRestrictedBacLogin && restrictedBacPartner) {
      onChangeBacSubTab(restrictedBacPartner);
      return;
    }

    dispatch(SaveReportActivePartner(tab));
    setActiveTab(tab);
     // Reset BAC sub-tab when switching away from BAC
    if (!BAC_SUB_TABS.includes(tab) && tab !== "bac") {
      setActiveBacSubTab("bac");
    }
  };


  // console.log(activeTab)
  // console.log(displayPartners)
  return (
      <div className="mb-2">
    <div className="flex items-center gap-2 mb-2 border-b pb-2">
      {displayPartners?.map((tab: string) => (
        <button
          key={tab}
          onClick={() => onChangeTab(tab)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all 
                        ${tab === "ixigo" && isPartnerTabActive(tab)
              ? "bg-[#fc790d] text-white shadow-md scale-105"
              : tab === "indigo" && isPartnerTabActive(tab)
                ? "bg-[#001b94] text-white shadow-md scale-105"
                : tab === "mojoboxx" && isPartnerTabActive(tab)
                  ? "bg-purple-600 text-white shadow-md scale-105"
                   : tab === "yatra" && isPartnerTabActive(tab)
                  ? "bg-red-600 text-white shadow-md scale-105"
                  : tab === "all" && isPartnerTabActive(tab)
                    ? "bg-yellow-500 text-white shadow-md scale-105"
                    : isPartnerTabActive(tab) ? "bg-blue-600 text-white" :"bg-gray-100 text-gray-700"
            }`}
        >
          {tab.toUpperCase()}
        </button>
      ))}
      {rightSlot ? <div className="ml-auto shrink-0">{rightSlot}</div> : null}
    </div>
     {/* BAC Sub-tabs — only show when BAC is active */}
      {isBacActive && (
        <div className="flex gap-2 mt-2 pl-2">
          {isRestrictedBacLogin && restrictedBacPartner && restrictedBacTabLabel ? (
            <button
              onClick={() => onChangeBacSubTab(restrictedBacPartner)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border
                ${activeBacSubTab === restrictedBacPartner
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
            >
              {restrictedBacTabLabel}
            </button>
          ) : (
            <>
              {/* "All BAC" option */}
              <button
                onClick={() => onChangeBacSubTab("bac")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border
                  ${activeBacSubTab === "bac"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
              >
                All BAC
              </button>

              {BAC_SUB_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => onChangeBacSubTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border
                    ${activeBacSubTab === tab
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {BAC_LABELS[tab]}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
    
  )
}
