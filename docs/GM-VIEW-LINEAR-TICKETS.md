# GM View — Linear Tickets

Quick-create links for each ticket. Click to open in Linear with pre-filled title and description.

---

## Phase 1: Navigation Foundation

### HER-GM-01: Restructure GM navigation config
[Create in Linear](https://linear.app/new?title=Restructure%20GM%20navigation%20config&description=Update%20%60src%2Fconfig%2Fnavigation.js%60%3A%0A-%20Change%20%60roleNav.gm%60%20to%204%20items%3A%20Overview%2C%20Compliance%2C%20Leads%2C%20Leaderboard%0A-%20Remove%3A%20gm-cancelled%2C%20gm-unused%2C%20gm-review%2C%20gm-spot-check%0A-%20Add%3A%20gm-leads%2C%20gm-leaderboard%0A-%20Update%20drillDownViews%20to%20include%20gm-lead-detail%0A-%20Keep%20roleDefaults.gm%20%3D%20%22gm-dashboard%22%0A%0AFiles%3A%20src%2Fconfig%2Fnavigation.js&priority=1)

### HER-GM-02: Update InteractiveShell for GM view routing
[Create in Linear](https://linear.app/new?title=Update%20InteractiveShell%20for%20GM%20view%20routing&description=Update%20viewComponents%20map%20and%20GM_MAIN_VIEWS%20in%20InteractiveShell.jsx.%0A-%20Remove%20old%20GM%20view%20mappings%0A-%20Add%20gm-leads%20%E2%86%92%20InteractiveGMLeadsPage%0A-%20Add%20gm-leaderboard%20%E2%86%92%20InteractiveGMLeaderboardPage%0A-%20Change%20GM_MAIN_VIEWS%20to%20%5B%22gm-dashboard%22%2C%20%22gm-compliance%22%5D%0A%0ADepends%20on%3A%20HER-GM-01%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveShell.jsx&priority=1)

### HER-GM-03: Update Sidebar for GM nav items
[Create in Linear](https://linear.app/new?title=Update%20Sidebar%20for%20GM%20nav%20items&description=Update%20SECTION_VIEW_IDS.gm%20to%20match%20new%20view%20IDs.%20GM%20nav%20is%20flat%20(no%20chevron%20groups).%20Ensure%20sidebar%20active%20highlighting%20works%20for%20new%20GM%20view%20IDs.%0A%0ADepends%20on%3A%20HER-GM-01%0AFiles%3A%20src%2Fcomponents%2Flayout%2FSidebar.jsx&priority=1)

### HER-GM-04: Update InteractiveDashboard GM section map
[Create in Linear](https://linear.app/new?title=Update%20InteractiveDashboard%20GM%20section%20map%20%2B%20scroll&description=Update%20GM_SECTION_MAP%20to%20only%202%20sections%3A%20dashboard%20%2B%20compliance.%20Replace%20inline%20GMDashboard%20with%20new%20InteractiveGMDashboard%20import.%20Remove%20old%20GM%20sections%20(cancelled-leads%2C%20unused-leads%2C%20lead-review%2C%20spot-check).%0A%0ADepends%20on%3A%20HER-GM-02%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveDashboard.jsx&priority=1)

---

## Phase 2: Data Layer

### HER-GM-05: Replace hardcoded GM stats with real-data selectors
[Create in Linear](https://linear.app/new?title=Replace%20hardcoded%20GM%20stats%20with%20real-data%20selectors&description=Build%20getGMDashboardStats(leads%2C%20dateRange)%20in%20demoSelectors.js.%20Computes%20from%20real%20leads%3A%20total%2C%20conversion%20rate%2C%20%25%20within%2030min%2C%20branch%20vs%20HRD%20split%2C%20comment%20compliance%2C%20cancelled%20unreviewed%2C%20unused%20overdue.%20With%20period-over-period%20change%20calc.%0A%0AFiles%3A%20src%2Fselectors%2FdemoSelectors.js&priority=2)

### HER-GM-06: Build GM trend selectors from real leads
[Create in Linear](https://linear.app/new?title=Build%20GM%20trend%20selectors%20from%20real%20leads&description=Replace%20getGMTrends()%20(hardcoded%20weeklyTrends.gm)%20with%20getGMMetricTrendByWeek(leads%2C%20opts).%20Supports%20metrics%3A%20conversion_rate%2C%20comment_rate%2C%20contacted_within_30_min%2C%20branch_vs_hrd_split.%20Supports%20groupBy%3A%20status%2C%20insurance_company%2C%20body_shop%2C%20branch.%20Can%20extend%20existing%20getMetricTrendByWeek%20with%20branch%3Dnull%20for%20all-branch%20mode.%0A%0ADepends%20on%3A%20HER-GM-05%0AFiles%3A%20src%2Fselectors%2FdemoSelectors.js&priority=2)

### HER-GM-07: Build GM branch leaderboard selector
[Create in Linear](https://linear.app/new?title=Build%20GM%20branch%20leaderboard%20selector&description=getGMBranchLeaderboard(leads%2C%20dateRange%2C%20sortMetric%2C%20scope).%20scope%3A%20%22my_branches%22%20(D.%20Williams)%20or%20%22all%22.%20Per-branch%3A%20conversion%20rate%2C%20%25%20within%2030min%2C%20comment%20rate%2C%20branch%20vs%20HRD%20%25%2C%20total%20leads.%20Sorted%20by%20sortMetric.%20Includes%20zone%20benchmark%20and%20trailing%204-week%20trend.%0A%0ADepends%20on%3A%20HER-GM-05%0AFiles%3A%20src%2Fselectors%2FdemoSelectors.js&priority=2)

### HER-GM-08: Build GM leads selector (merged cancelled + unused)
[Create in Linear](https://linear.app/new?title=Build%20GM%20leads%20selector%20(merged%20cancelled%20%2B%20unused)&description=getGMLeads(leads%2C%20dateRange%2C%20filters).%20Returns%20cancelled%20%2B%20unused%20leads.%20Supports%20filters%3A%20statusFilter%2C%20bmFilter%2C%20branchFilter%2C%20insuranceFilter.%20Sorted%20by%20priority%20(reuse%20getLeadPriority).%20Date%20range%20filtering.%0A%0AFiles%3A%20src%2Fselectors%2FdemoSelectors.js&priority=2)

---

## Phase 3: GM Dashboard

### HER-GM-09: Build InteractiveGMDashboard component
[Create in Linear](https://linear.app/new?title=Build%20InteractiveGMDashboard%20component&description=New%20component%20replacing%20inline%20GMDashboard.%20Black%20metric%20tiles%3A%20Total%20Leads%2C%20Conversion%20Rate%2C%20%25%20Contacted%20Within%2030%20Min%20(%231%20metric)%2C%20Branch%20vs%20HRD%20Split%2C%20Comment%20Compliance%2C%20Cancelled%20Unreviewed.%20Date%20range%20selector%20(same%20presets%20as%20BM).%20Period-over-period%20change%20arrows.%20Time-to-Contact%20bar%20breakdown%20%2B%20Contact%20Source%20card%20from%20real%20data.%20GM%20context%20header.%0A%0ADepends%20on%3A%20HER-GM-05%2C%20HER-GM-04%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveGMDashboard.jsx&priority=2)

### HER-GM-10: Add conversion trend chart to GM dashboard
[Create in Linear](https://linear.app/new?title=Add%20conversion%20trend%20chart%20to%20GM%20dashboard&description=Trend%20chart%20section%20below%20metric%20tiles.%20Reuse%20ConversionTrendChart%20pattern.%20Zone-level%20conversion%20rate%20over%20time.%20GroupBy%20selector%20(branch%2C%20insurance%2C%20body%20shop%2C%20status).%20Stacked%20bar%20when%20grouped.%20Overlay%20line%20for%20aggregate%20rate.%20Uses%20getGMMetricTrendByWeek%20selector.%0A%0ADepends%20on%3A%20HER-GM-06%2C%20HER-GM-09%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveGMDashboard.jsx&priority=2)

---

## Phase 4: Compliance

### HER-GM-11: Enhance InteractiveComplianceDashboard with real data
[Create in Linear](https://linear.app/new?title=Enhance%20InteractiveComplianceDashboard%20with%20real%20data&description=Switch%20from%20getGMStats()%20(hardcoded)%20to%20getGMDashboardStats()%20(real%20data).%20Add%20date%20range%20filter.%20Per-branch%20compliance%20breakdown%20table%3A%20branch%2C%20BM%2C%20total%20leads%2C%20commented%20%25%2C%20conversion%20rate.%20Branch-level%20progress%20bars.%20Insurance%20company%20filter.%20Derive%20GM%20name%20from%20context.%0A%0ADepends%20on%3A%20HER-GM-05%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveComplianceDashboard.jsx%2C%20src%2Fcomponents%2FComplianceDashboard.jsx&priority=3)

---

## Phase 5: GM Leads View

### HER-GM-12: Build InteractiveGMLeadsPage — merged leads table
[Create in Linear](https://linear.app/new?title=Build%20InteractiveGMLeadsPage%20%E2%80%94%20merged%20leads%20table&description=Full-page%20table%20view.%20Filter%20bar%3A%20Status%20(All%2FCancelled%2FUnused)%2C%20BM%2C%20Branch%2C%20Insurance%2C%20Date%20range%2C%20Search.%20Table%20columns%3A%20Customer%2C%20Reservation%20ID%2C%20Status%2C%20Branch%2C%20BM%2C%20Days%20Open%2C%20Contact%20Range%2C%20Mismatch%20flag%2C%20Comments%20indicator.%20Default%20sort%20by%20priority.%20Row%20click%20opens%20slide-in%20panel%20(HER-GM-13).%0A%0ADepends%20on%3A%20HER-GM-08%2C%20HER-GM-02%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveGMLeadsPage.jsx&priority=2)

### HER-GM-13: Build slide-in lead profile panel for GM
[Create in Linear](https://linear.app/new?title=Build%20slide-in%20lead%20profile%20panel%20for%20GM&description=Slide-in%20from%20right%20on%20lead%20row%20click.%20Three-column%20layout%3A%20HLES%20data%20%7C%20TRANSLOG%20trail%20%7C%20BM%20Comments%20%2B%20GM%20Directives.%20Mismatch%20warning%20banner.%20Actions%3A%20Add%20GM%20Directive%2C%20Archive%20Reviewed%2C%20Next%2FPrev%20lead%20arrows.%20Framer%20Motion%20slide%20animation%20with%20overlay.%20Reuse%20ThreeColumnReview%2C%20TranslogTimeline%2C%20StatusBadge.%0A%0ADepends%20on%3A%20HER-GM-12%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveGMLeadsPage.jsx&priority=2)

---

## Phase 6: Leaderboard

### HER-GM-14: Build InteractiveGMLeaderboardPage
[Create in Linear](https://linear.app/new?title=Build%20InteractiveGMLeaderboardPage&description=Scope%20toggle%3A%20My%20Branches%20%7C%20All%20Branches.%20Sort%20by%3A%20Conversion%20Rate%20%7C%20%25%20Within%2030%20Min%20%7C%20Comment%20Rate%20%7C%20Branch%20vs%20HRD%20%25.%20Date%20range%20presets.%20Table%3A%20Rank%2C%20Branch%2C%20BM%2C%20Stacked%20bar%20(Rented%2FCancelled%2FUnused)%2C%20Metrics%2C%20Trend%20arrows.%20Zone%20benchmark%20pinned%20row.%20Most%20Improved%20toggle.%0A%0ADepends%20on%3A%20HER-GM-07%2C%20HER-GM-02%0AFiles%3A%20src%2Fcomponents%2Finteractive%2FInteractiveGMLeaderboardPage.jsx&priority=2)

---

## Phase 7: Polish

### HER-GM-15: Hertz branding consistency across GM views
[Create in Linear](https://linear.app/new?title=Hertz%20branding%20consistency%20across%20GM%20views&description=Ensure%20all%20GM%20components%20match%20BM%20styling%3A%20black%20metric%20tiles%2C%20black%20table%20headers%2C%20gold%20accents%2C%20consistent%20spacing%2C%20Framer%20Motion%20animations.%0AFiles%3A%20All%20new%20GM%20components&priority=3)

### HER-GM-16: Test scroll navigation for GM shared page
[Create in Linear](https://linear.app/new?title=Test%20scroll%20navigation%20for%20GM%20shared%20page&description=Verify%20IntersectionObserver%20with%202%20GM%20sections.%20Bottom-of-page%20detection.%20Sidebar%20active%20state.%20Refresh%20lands%20on%20gm-dashboard.%20Separate%20pages%20get%20AnimatePresence%20transitions.%0ADepends%20on%3A%20HER-GM-04%0AFiles%3A%20InteractiveDashboard.jsx%2C%20Sidebar.jsx%2C%20InteractiveShell.jsx&priority=3)

### HER-GM-17: Document Supabase data gaps for GM views
[Create in Linear](https://linear.app/new?title=Document%20Supabase%20data%20gaps%20for%20GM%20views&description=Audit%20and%20flag%3A%20orgMapping%20(mockData%20vs%20Supabase)%2C%20branchManagers%20source%2C%20contact_range%2Ffirst_contact_by%2Fbody_shop%2Fweek_of%20column%20mappings%20in%20leadFromRow()%2C%20tasks%20fetch%2C%20mismatch%2FgmDirective%20columns.%0AFiles%3A%20supabaseData.js%2C%20mockData.js%2C%20DataContext.jsx&priority=3)
