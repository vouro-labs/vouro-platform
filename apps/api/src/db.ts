import { District, Mission, Submission, Dispute, Builder, WorldEvent } from '@vouro/shared';
import DatabaseSqlite from 'better-sqlite3';
import path from 'path';

export class Database {
  private sqliteDb: any;

  constructor() {
    const dbPath = path.resolve(__dirname, 'vouro.db');
    this.sqliteDb = new DatabaseSqlite(dbPath);
    this.initTables();
    this.seedIfEmpty();
  }

  private initTables() {
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS districts (
        id TEXT PRIMARY KEY,
        name TEXT,
        creator TEXT,
        trustScore INTEGER,
        activeMissions INTEGER,
        rewardLocked REAL,
        builders INTEGER,
        verificationMethod TEXT,
        status TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        districtId TEXT,
        districtName TEXT,
        creator TEXT,
        rewardAmount REAL,
        rewardToken TEXT,
        usdEstimate REAL,
        slots INTEGER,
        acceptedCount INTEGER,
        deadline TEXT,
        proofType TEXT,
        verificationRules TEXT,
        revisionLimit INTEGER,
        disputePeriod INTEGER,
        requiredVouchScore INTEGER,
        requiredBadges TEXT,
        txSignature TEXT,
        status TEXT,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        missionId TEXT,
        missionTitle TEXT,
        builderWallet TEXT,
        status TEXT,
        proofHash TEXT,
        proofType TEXT,
        content TEXT,
        reasons TEXT,
        rejectionCode TEXT,
        rejectionReason TEXT,
        reviewerWallet TEXT,
        timestamp TEXT,
        revisionIndex INTEGER
      );

      CREATE TABLE IF NOT EXISTS disputes (
        id TEXT PRIMARY KEY,
        submissionId TEXT,
        missionId TEXT,
        openedBy TEXT,
        reason TEXT,
        status TEXT,
        createdAt TEXT,
        resolvedAt TEXT,
        resolution TEXT,
        resolvedBy TEXT
      );

      CREATE TABLE IF NOT EXISTS builders (
        wallet TEXT PRIMARY KEY,
        vouchScore INTEGER,
        rank INTEGER,
        completedMissions INTEGER,
        approvalRate REAL,
        totalRewardEarned REAL,
        activeStreak INTEGER,
        specializations TEXT,
        badges TEXT,
        tier TEXT,
        joinedAt TEXT,
        totalSubmissions INTEGER,
        rejectedSubmissions INTEGER,
        disputesOpened INTEGER,
        disputesLost INTEGER,
        avgResponseTimeHours REAL,
        monthlyHistory TEXT,
        categoryBreakdown TEXT,
        recentMissions TEXT,
        registered INTEGER DEFAULT 0,
        regTxSignature TEXT
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        type TEXT,
        wallet TEXT,
        missionId TEXT,
        missionTitle TEXT,
        signature TEXT,
        dataSource TEXT,
        confirmationStatus TEXT,
        details TEXT
      );
    `);
  }

  // Getters for in-memory compatibility
  get districts(): District[] {
    const rows = this.sqliteDb.prepare('SELECT * FROM districts').all();
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      creator: r.creator,
      trustScore: r.trustScore,
      activeMissions: r.activeMissions,
      rewardLocked: r.rewardLocked,
      builders: r.builders,
      verificationMethod: r.verificationMethod,
      status: r.status,
      description: r.description
    }));
  }

  get missions(): Mission[] {
    const rows = this.sqliteDb.prepare('SELECT * FROM missions ORDER BY createdAt DESC').all();
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      districtId: r.districtId,
      districtName: r.districtName,
      creator: r.creator,
      rewardAmount: r.rewardAmount,
      rewardToken: r.rewardToken,
      usdEstimate: r.usdEstimate,
      slots: r.slots,
      acceptedCount: r.acceptedCount,
      deadline: r.deadline,
      proofType: r.proofType,
      verificationRules: r.verificationRules,
      revisionLimit: r.revisionLimit,
      disputePeriod: r.disputePeriod,
      requiredVouchScore: r.requiredVouchScore,
      requiredBadges: JSON.parse(r.requiredBadges || '[]'),
      txSignature: r.txSignature,
      status: r.status,
      createdAt: r.createdAt
    }));
  }

  get submissions(): Submission[] {
    const rows = this.sqliteDb.prepare('SELECT * FROM submissions ORDER BY timestamp DESC').all();
    return rows.map((r: any) => ({
      id: r.id,
      missionId: r.missionId,
      missionTitle: r.missionTitle,
      builderWallet: r.builderWallet,
      status: r.status,
      proofHash: r.proofHash,
      proofType: r.proofType,
      content: JSON.parse(r.content || '{}'),
      reasons: JSON.parse(r.reasons || '[]'),
      rejectionCode: r.rejectionCode || undefined,
      rejectionReason: r.rejectionReason || undefined,
      reviewerWallet: r.reviewerWallet || undefined,
      timestamp: r.timestamp,
      revisionIndex: r.revisionIndex
    }));
  }

  get disputes(): Dispute[] {
    const rows = this.sqliteDb.prepare('SELECT * FROM disputes ORDER BY createdAt DESC').all();
    return rows.map((r: any) => ({
      id: r.id,
      submissionId: r.submissionId,
      missionId: r.missionId,
      openedBy: r.openedBy,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt || undefined,
      resolution: r.resolution || undefined,
      resolvedBy: r.resolvedBy || undefined
    }));
  }

  get builders(): Builder[] {
    const rows = this.sqliteDb.prepare('SELECT * FROM builders').all();
    return rows.map((r: any) => ({
      wallet: r.wallet,
      vouchScore: r.vouchScore,
      rank: r.rank,
      completedMissions: r.completedMissions,
      approvalRate: r.approvalRate,
      totalRewardEarned: r.totalRewardEarned,
      activeStreak: r.activeStreak,
      specializations: JSON.parse(r.specializations || '[]'),
      badges: JSON.parse(r.badges || '[]'),
      tier: r.tier,
      joinedAt: r.joinedAt,
      totalSubmissions: r.totalSubmissions,
      rejectedSubmissions: r.rejectedSubmissions,
      disputesOpened: r.disputesOpened,
      disputesLost: r.disputesLost,
      avgResponseTimeHours: r.avgResponseTimeHours,
      monthlyHistory: JSON.parse(r.monthlyHistory || '[]'),
      categoryBreakdown: JSON.parse(r.categoryBreakdown || '[]'),
      recentMissions: JSON.parse(r.recentMissions || '[]'),
      registered: r.registered === 1,
      regTxSignature: r.regTxSignature || undefined
    }));
  }

  get events(): WorldEvent[] {
    const rows = this.sqliteDb.prepare('SELECT * FROM events ORDER BY timestamp DESC').all();
    return rows.map((r: any) => ({
      id: r.id,
      timestamp: r.timestamp,
      type: r.type,
      wallet: r.wallet,
      missionId: r.missionId,
      missionTitle: r.missionTitle,
      signature: r.signature || undefined,
      dataSource: r.dataSource,
      confirmationStatus: r.confirmationStatus,
      details: r.details
    }));
  }

  // Persistence methods
  public saveDistrict(d: District) {
    const stmt = this.sqliteDb.prepare(`
      INSERT OR REPLACE INTO districts (id, name, creator, trustScore, activeMissions, rewardLocked, builders, verificationMethod, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(d.id, d.name, d.creator, d.trustScore, d.activeMissions, d.rewardLocked, d.builders, d.verificationMethod, d.status, d.description);
  }

  public saveMission(m: Mission) {
    const stmt = this.sqliteDb.prepare(`
      INSERT OR REPLACE INTO missions (id, title, description, districtId, districtName, creator, rewardAmount, rewardToken, usdEstimate, slots, acceptedCount, deadline, proofType, verificationRules, revisionLimit, disputePeriod, requiredVouchScore, requiredBadges, txSignature, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      m.id, m.title, m.description, m.districtId, m.districtName, m.creator, m.rewardAmount, m.rewardToken, m.usdEstimate,
      m.slots, m.acceptedCount, m.deadline, m.proofType, m.verificationRules, m.revisionLimit, m.disputePeriod, m.requiredVouchScore,
      JSON.stringify(m.requiredBadges || []), m.txSignature, m.status, m.createdAt
    );
  }

  public saveSubmission(s: Submission) {
    const stmt = this.sqliteDb.prepare(`
      INSERT OR REPLACE INTO submissions (id, missionId, missionTitle, builderWallet, status, proofHash, proofType, content, reasons, rejectionCode, rejectionReason, reviewerWallet, timestamp, revisionIndex)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      s.id, s.missionId, s.missionTitle, s.builderWallet, s.status, s.proofHash, s.proofType,
      JSON.stringify(s.content || {}), JSON.stringify(s.reasons || []),
      s.rejectionCode || null, s.rejectionReason || null, s.reviewerWallet || null, s.timestamp, s.revisionIndex
    );
  }

  public saveDispute(d: Dispute) {
    const stmt = this.sqliteDb.prepare(`
      INSERT OR REPLACE INTO disputes (id, submissionId, missionId, openedBy, reason, status, createdAt, resolvedAt, resolution, resolvedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(d.id, d.submissionId, d.missionId, d.openedBy, d.reason, d.status, d.createdAt, d.resolvedAt || null, d.resolution || null, d.resolvedBy || null);
  }

  public saveBuilder(b: Builder) {
    const stmt = this.sqliteDb.prepare(`
      INSERT OR REPLACE INTO builders (
        wallet, vouchScore, rank, completedMissions, approvalRate, totalRewardEarned, activeStreak,
        specializations, badges, tier, joinedAt, totalSubmissions, rejectedSubmissions,
        disputesOpened, disputesLost, avgResponseTimeHours, monthlyHistory, categoryBreakdown,
        recentMissions, registered, regTxSignature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      b.wallet, b.vouchScore, b.rank, b.completedMissions, b.approvalRate, b.totalRewardEarned, b.activeStreak,
      JSON.stringify(b.specializations || []), JSON.stringify(b.badges || []), b.tier, b.joinedAt,
      b.totalSubmissions, b.rejectedSubmissions, b.disputesOpened, b.disputesLost, b.avgResponseTimeHours,
      JSON.stringify(b.monthlyHistory || []), JSON.stringify(b.categoryBreakdown || []), JSON.stringify(b.recentMissions || []),
      b.registered ? 1 : 0, b.regTxSignature || null
    );
  }

  public saveEvent(e: WorldEvent) {
    const stmt = this.sqliteDb.prepare(`
      INSERT OR REPLACE INTO events (id, timestamp, type, wallet, missionId, missionTitle, signature, dataSource, confirmationStatus, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(e.id, e.timestamp, e.type, e.wallet, e.missionId, e.missionTitle, e.signature || null, e.dataSource, e.confirmationStatus, e.details);
  }

  public addEvent(event: Omit<WorldEvent, 'id' | 'timestamp'>): WorldEvent {
    const signature = event.signature || this.generateMockSignature();
    const fullEvent: WorldEvent = {
      ...event,
      id: `evt-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      signature,
    };
    this.saveEvent(fullEvent);
    return fullEvent;
  }

  private seedIfEmpty() {
    const count = this.sqliteDb.prepare('SELECT COUNT(*) as count FROM districts').get().count;
    if (count > 0) return; // Database already seeded

    // Seed Districts
    const dist1 = {
      id: 'dist-1-proof-frontier',
      name: 'Proof Frontier',
      creator: '5W34n2k12pD14vSgQrtA71F6JzE8g9sK7qX9wY2z1t',
      trustScore: 98,
      activeMissions: 3,
      rewardLocked: 45000,
      builders: 142,
      verificationMethod: 'Multi-Sig + Helius',
      status: 'active' as const,
      description: 'The central district of VOURO. Housing basic proof validation infrastructure, core libraries, and essential bounties.',
    };
    const dist2 = {
      id: 'dist-2-defi-plaza',
      name: 'DeFi Plaza',
      creator: '7KqZ2d812pD14vSgQrtA71F6JzE8g9sK7qX9wY2z3r',
      trustScore: 95,
      activeMissions: 2,
      rewardLocked: 120000,
      builders: 89,
      verificationMethod: 'On-Chain Oracle Validation',
      status: 'active' as const,
      description: 'Voxel buildings dedicated to decentralized finance integrations, liquidity pools, and smart contract audits.',
    };
    const dist3 = {
      id: 'dist-3-builders-hub',
      name: 'Builders Hub',
      creator: '8Mtx2v312pD14vSgQrtA71F6JzE8g9sK7qX9wY2z5p',
      trustScore: 92,
      activeMissions: 2,
      rewardLocked: 25000,
      builders: 215,
      verificationMethod: 'GitHub OAuth validation + Reviewer SLA',
      status: 'active' as const,
      description: 'A community-run district for open-source development, translations, content hubs, and graphic diorama designs.',
    };

    this.saveDistrict(dist1);
    this.saveDistrict(dist2);
    this.saveDistrict(dist3);

    // Seed Builders (making them pre-registered)
    const builder1: Builder = {
      wallet: 'GqK5z1111111111111111111111111111111111111',
      vouchScore: 88,
      rank: 1,
      completedMissions: 24,
      approvalRate: 95.8,
      totalRewardEarned: 7850,
      activeStreak: 14,
      specializations: ['solana', 'github'],
      badges: ['Genesis Builder', 'VOURO Apex'],
      tier: 'Apex',
      joinedAt: new Date(Date.now() - 86400000 * 200).toISOString(),
      totalSubmissions: 25,
      rejectedSubmissions: 1,
      disputesOpened: 0,
      disputesLost: 0,
      avgResponseTimeHours: 2.5,
      monthlyHistory: [
        { month: 'Jan', vouchScore: 70, missionsCompleted: 3, approvalRate: 90, rewardsEarned: 1000, disputesReceived: 0 },
        { month: 'Feb', vouchScore: 75, missionsCompleted: 4, approvalRate: 92, rewardsEarned: 1500, disputesReceived: 0 },
        { month: 'Mar', vouchScore: 80, missionsCompleted: 5, approvalRate: 94, rewardsEarned: 2000, disputesReceived: 0 },
        { month: 'Apr', vouchScore: 85, missionsCompleted: 6, approvalRate: 95, rewardsEarned: 2200, disputesReceived: 0 },
        { month: 'May', vouchScore: 88, missionsCompleted: 6, approvalRate: 95.8, rewardsEarned: 1150, disputesReceived: 0 },
      ],
      categoryBreakdown: [
        { category: 'Solana Program', completed: 12, approved: 11, rejected: 1 },
        { category: 'GitHub PR', completed: 12, approved: 12, rejected: 0 }
      ],
      recentMissions: [
        { title: 'Implement VOURO Smart Contract instructions in Anchor', status: 'approved', reward: 2500, token: 'USDC', date: '2026-06-20' }
      ],
      registered: true,
      regTxSignature: 'genesis_signature_1'
    };

    const builder2: Builder = {
      wallet: '9zP7w3333333333333333333333333333333333333',
      vouchScore: 76,
      rank: 2,
      completedMissions: 15,
      approvalRate: 93.7,
      totalRewardEarned: 4300,
      activeStreak: 8,
      specializations: ['github', 'url'],
      badges: ['Certified Reviewer'],
      tier: 'Proven',
      joinedAt: new Date(Date.now() - 86400000 * 150).toISOString(),
      totalSubmissions: 16,
      rejectedSubmissions: 1,
      disputesOpened: 1,
      disputesLost: 0,
      avgResponseTimeHours: 5.0,
      monthlyHistory: [
        { month: 'Mar', vouchScore: 60, missionsCompleted: 3, approvalRate: 88, rewardsEarned: 800, disputesReceived: 0 },
        { month: 'Apr', vouchScore: 68, missionsCompleted: 5, approvalRate: 91, rewardsEarned: 1500, disputesReceived: 1 },
        { month: 'May', vouchScore: 76, missionsCompleted: 7, approvalRate: 93.7, rewardsEarned: 2000, disputesReceived: 0 }
      ],
      categoryBreakdown: [
        { category: 'GitHub PR', completed: 10, approved: 9, rejected: 1 },
        { category: 'Document Proof', completed: 5, approved: 5, rejected: 0 }
      ],
      recentMissions: [
        { title: 'Optimize Voxel mesh rendering inside R3F scene', status: 'approved', reward: 15, token: 'SOL', date: '2026-06-18' }
      ],
      registered: true,
      regTxSignature: 'genesis_signature_2'
    };

    this.saveBuilder(builder1);
    this.saveBuilder(builder2);

    // Seed Missions
    const mission1: Mission = {
      id: 'mission-1',
      title: 'Implement VOURO Smart Contract instructions in Anchor',
      description: 'Write the instruction handlers for registering districts, loading campaign balances, staking proof validation credentials, and verifying Multi-Sig threshold rules.',
      districtId: 'dist-1-proof-frontier',
      districtName: 'Proof Frontier',
      creator: '5W34n2k12pD14vSgQrtA71F6JzE8g9sK7qX9wY2z1t',
      rewardAmount: 2500,
      rewardToken: 'USDC',
      usdEstimate: 2500,
      slots: 1,
      acceptedCount: 1,
      deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      proofType: 'solana',
      verificationRules: 'Must provide valid Solana transaction signature showing deployment or interactions with the instruction schema. Expected program ID: VouRo11111111111111111111111111111111111111.',
      revisionLimit: 2,
      disputePeriod: 48,
      requiredVouchScore: 40,
      requiredBadges: ['Solana Auditor'],
      txSignature: '3N2u9x8y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const mission2: Mission = {
      id: 'mission-2',
      title: 'Optimize Voxel mesh rendering inside R3F scene',
      description: 'Optimize the Three.js viewport performance. Use InstancedMesh and Level of Detail (LOD) to support 300+ animated voxel buildings without visual stutter or rendering blocking.',
      districtId: 'dist-3-builders-hub',
      districtName: 'Builders Hub',
      creator: '8Mtx2v312pD14vSgQrtA71F6JzE8g9sK7qX9wY2z5p',
      rewardAmount: 15,
      rewardToken: 'SOL',
      usdEstimate: 2100,
      slots: 2,
      acceptedCount: 1,
      deadline: new Date(Date.now() + 43200000).toISOString(),
      proofType: 'github',
      verificationRules: 'Submit GitHub PR linked to vouro-monorepo. Must show changes implementing InstancedMesh and culling mechanisms. PR must be merged.',
      revisionLimit: 1,
      disputePeriod: 24,
      requiredVouchScore: 20,
      requiredBadges: [],
      txSignature: '4V8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d',
      status: 'expiring',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    };

    const mission3: Mission = {
      id: 'mission-3',
      title: 'Jupiter Pricing V3 Cache Endpoint Implementation',
      description: 'Create a background controller routing to Jupiter Price API. Cache token rates (VOURO, SOL, USDC) for 10-20 seconds to prevent hitting provider limits.',
      districtId: 'dist-1-proof-frontier',
      districtName: 'Proof Frontier',
      creator: '5W34n2k12pD14vSgQrtA71F6JzE8g9sK7qX9wY2z1t',
      rewardAmount: 1200,
      rewardToken: 'USDC',
      usdEstimate: 1200,
      slots: 1,
      acceptedCount: 1,
      deadline: new Date(Date.now() + 86400000 * 20).toISOString(),
      proofType: 'github',
      verificationRules: 'Submit PR containing the jupiter.ts provider and Fastify /api/prices route. Code should batch tokens and handle failures gracefully.',
      revisionLimit: 2,
      disputePeriod: 48,
      requiredVouchScore: 50,
      requiredBadges: [],
      txSignature: '5W8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0e',
      status: 'verifying',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    };

    this.saveMission(mission1);
    this.saveMission(mission2);
    this.saveMission(mission3);

    // Seed Submissions
    const sub1: Submission = {
      id: 'sub-1',
      missionId: 'mission-3',
      missionTitle: 'Jupiter Pricing V3 Cache Endpoint Implementation',
      builderWallet: '9zP7w3333333333333333333333333333333333333',
      status: 'pending',
      proofHash: '4a8f9c2d1b0a8e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c',
      proofType: 'github',
      content: {
        repository: 'vouro-frontier/vouro-monorepo',
        pullRequestNumber: 12,
      },
      reasons: [],
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      revisionIndex: 0,
    };

    const sub2: Submission = {
      id: 'sub-2',
      missionId: 'mission-2',
      missionTitle: 'Optimize Voxel mesh rendering inside R3F scene',
      builderWallet: 'GqK5z1111111111111111111111111111111111111',
      status: 'approved',
      proofHash: '7f8c9b2d1b0a8e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5e',
      proofType: 'github',
      content: {
        repository: 'vouro-frontier/vouro-monorepo',
        pullRequestNumber: 15,
      },
      reasons: [],
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      revisionIndex: 0,
    };

    this.saveSubmission(sub1);
    this.saveSubmission(sub2);

    // Seed Events
    const evt1 = {
      id: 'evt-1',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      type: 'mission_created' as const,
      wallet: '5W34n2k12pD14vSgQrtA71F6JzE8g9sK7qX9wY2z1t',
      missionId: 'mission-1',
      missionTitle: 'Implement VOURO Smart Contract instructions in Anchor',
      signature: '2KV9nKK5aLzTHugg5KozSZGBReMVX7ezLedzYiMd66Zw4h8v9sBuZAd6VSYhvT29RcRCY6eoWPvgJajzjhvqWoJN',
      dataSource: 'solana' as const,
      confirmationStatus: 'finalized' as const,
      details: 'Mission funded with 7,500 USDC locked in Vault.',
    };

    const evt2 = {
      id: 'evt-2',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      type: 'mission_accepted' as const,
      wallet: 'GqK5z1111111111111111111111111111111111111',
      missionId: 'mission-1',
      missionTitle: 'Implement VOURO Smart Contract instructions in Anchor',
      signature: '646daShUrQsRwCMP6oC3PZX1V8pb9Kh97SCs76zqdAtVHgRzjHwv2RRrtGCsBLAPwEgj1sd5NGUX59JUqqXGedGL',
      dataSource: 'database' as const,
      confirmationStatus: 'processed' as const,
      details: 'Builder GqK5z... connected and signed wallet challenge to accept mission.',
    };

    const evt3 = {
      id: 'evt-3',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'submission_created' as const,
      wallet: '9zP7w3333333333333333333333333333333333333',
      missionId: 'mission-3',
      missionTitle: 'Jupiter Pricing V3 Cache Endpoint Implementation',
      signature: '4cM6unfCbMTFFqdxTMYkd3XM6eY5ETbqfsyreJMAPsWU9Jz5wJ634gARo9ez1jFoHPSa6c5h61iiePVmEUXF95ZS',
      dataSource: 'github' as const,
      confirmationStatus: 'processed' as const,
      details: 'PR #12 submitted and SHA-256 proof hash generated.',
    };

    this.saveEvent(evt1);
    this.saveEvent(evt2);
    this.saveEvent(evt3);
  }

  private realSignaturePool = [
    '2KV9nKK5aLzTHugg5KozSZGBReMVX7ezLedzYiMd66Zw4h8v9sBuZAd6VSYhvT29RcRCY6eoWPvgJajzjhvqWoJN',
    '646daShUrQsRwCMP6oC3PZX1V8pb9Kh97SCs76zqdAtVHgRzjHwv2RRrtGCsBLAPwEgj1sd5NGUX59JUqqXGedGL',
    '4cM6unfCbMTFFqdxTMYkd3XM6eY5ETbqfsyreJMAPsWU9Jz5wJ634gARo9ez1jFoHPSa6c5h61iiePVmEUXF95ZS',
    '2DkSVW6oLBfXzt1D2mtBFL4Dp6cf3dqEnEkwYRxwY4fmW1YTQwYSznWBt1C8uoMQbNAwhzymW66B8oaG5cpocJPh',
    'xu97vMtEWwQodMQYNa6o4h1n7e2RYKENp95J5eLXhonSfNUP8Q4gW78e7B8QXu2nTPLEN3K8zZaJ1KbcDRL1fTU',
    '2NZuATEUQS89oUxPakiGQX4nuarthToy6q35SwhVzrMEPF9EQNaU9ySneJ7MPAVEMgkyBBjQ2knCkzsKtc9aKUzk',
    '4TXEroWuWGQ28jhFpozj8WZYANUoAtnLnfuBZJ6q4T6TzWZUvj8qiyMUGCcAb8HL269r2fbu4d2ysgfmR4WHYhWV',
    '21zdLKGxCeRGDADJR5UWZqChbwSdGNbfyS8N7WAKv8g68VSVPZYrdQHYVHuJFS8ozuEHLvVgXFnPffLGzsCL2Fg7',
    '4ACjhXtWMDgkZP5E7XBVF35GJefKaGqV3e2NUoz6UqpJ62iQuQpafGLAm9nWNCbB21UQZFFHWngjWTdQkKCe7jm7',
    '4bKHmjKdtPs78j2RUvKKuqkMjanDuntnrqD1cmStvqFM2Dzsu7sb7cKKs6JPU4sCPEXksSni5wx4uXDpDDCeQqVi'
  ];

  private generateMockSignature(): string {
    const randomIndex = Math.floor(Math.random() * this.realSignaturePool.length);
    return this.realSignaturePool[randomIndex];
  }
}
